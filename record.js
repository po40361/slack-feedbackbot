var Airtable = require("airtable");
var base = new Airtable({ apiKey: "key9KgrwX5Z5FsP26" }).base(
  "appMfcy98yxGtYwDO"
);
var apple = "UCQC2QMQX";
var id = "{Slack ID} = '" + apple + "'";
var student_info = "";
base("Students")
  .select({
    maxRecords: 1,
    view: "Master Data",
    filterByFormula: id
  })
  .eachPage((records, fetchNextPage) => {
    records.forEach(record => {
      const name = record.get("Name");
      student_info = name;
    });
    fetchNextPage();
  })
  .then(() => {
    base("Students")
      .select({
        maxRecords: 1,
        view: "Master Data",
        filterByFormula: "{Name} = '" + student_info + "'"
      })
      .eachPage(
        function page(records, fetchNextPage) {
          records.forEach(function(record) {
            console.log("Retrieved", record.get("Name"));
          });
          fetchNextPage();
        },
        function done(err) {
          if (err) {
            console.error(err);
            return;
          }
        }
      );
  });
