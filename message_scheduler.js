/*
 * message_scheduler.js
 * 
 * Retrieve course data from Airtable and schedule feedback surveys in Slack
 * 
 * by Forrest Feaser and Camille Cooper
 * for HackCville, Inc.
 * 
 * 11/02/2019
 */

require("dotenv").config();

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID_PROD = process.env.AIRTABLE_BASE_ID_PROD;
const SLACK_BOT_TOKEN_HCCOMMUNITY = process.env.SLACK_BOT_TOKEN_HCCOMMUNITY;
const COURSES_TABLE_NAME = "Courses"

const { WebClient } = require("@slack/web-api");
const web = new WebClient(SLACK_BOT_TOKEN_HCCOMMUNITY);

const Airtable = require("airtable");
const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID_PROD);

//for staggering messages, but doesn't work with async
const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

const scheduleMessages = async () => {

  const courses = [];

  await base(COURSES_TABLE_NAME)
    .select({
      fields: ["Course Title", "Slack ID", "Survey Datetime", "Meeting Day"], 
      filterByFormula: "AND(NOT({Course Title} = ''), NOT({Slack ID} = ''), NOT({Survey Datetime} = ''))"
    })

    //retrieve the relevant data for each course
    .eachPage((records, fetchNextPage) => {
      records.forEach(record => {
        const course_data = {
          course_title: record.get("Course Title"),
          student_slack_ids: record.get("Slack ID"),
          survey_date: record.get("Survey Datetime")
        }
        courses.push(course_data);
      });
      fetchNextPage();
    })

    .then(() => {
      courses.forEach(course => {

        const course_title = course.course_title;
        const slack_ids = course.student_slack_ids;
        //watch out for DST
        const message_date = new Date(course.survey_date);
        const message_date_epoch_secs = message_date.getTime() / 1000;

        slack_ids.forEach(user_id => {

          //scheduled message containing link to feedback form
          const scheduled_bot_message = {
            token: SLACK_BOT_TOKEN_HCCOMMUNITY,
            channel: user_id,
            post_at: message_date_epoch_secs,
            link_names: true,
            as_user: false, //make this true for message to appear in feedbackbot DM
            attachments: [
              {
                text: `Hey <@${user_id}>, would you mind giving us some feedback on ${course_title}?`,
                callback_id: "feedback_form_open",
                color: "#3149EC",
                attachment_type: "default",
                actions: [
                  {
                    name: "feedback_button",
                    text: "Begin Survey!",
                    type: "button",
                    value: "feedback"
                  }
                ]
              }
            ]
          };

          (async () =>  {
            //https://api.slack.com/methods/chat.scheduleMessage
            await web.chat.scheduleMessage(scheduled_bot_message)
            .then(() => {
              console.log(
                `Message scheduled for ${user_id} at ${message_date.toLocaleString()}`
              );
            })
            .catch(err => {
              console.log(err);
            });

          })();

        });

      });

    })

    .catch(err => {
      console.log(err);
    });

};

//call to main function to schedule messages
scheduleMessages();
