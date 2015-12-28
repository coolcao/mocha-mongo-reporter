var debug       = require('debug')('mocha:mongoreporter'),
    Q           = require('q'),
    mongo       = require('mongodb'),
    dateFormat  = require('dateFormat'), now;
    os          = require('os'),
    snap        = require('env-snapshot').EnvSnapshot();

module.exports = mocha_mongo_reporter;

function mocha_mongo_reporter(runner, options) {
  var db = null;

  var passes = [];
  var failures = [];

  var meta = { 
    user: snap.process_env["USER"], 
    host: snap.os_hostname, 
    type: snap.os_type, 
    platform: snap.os_platform, 
    arch: snap.os_arch, 
    release: snap.os_release, 
    totalmem: snap.os_totalmem, 
    freemem: snap.os_freemem, 
    cpus: snap.os_cpus
  };

  var runnerEnd=Q.defer(), 
      mongoConnect=Q.defer();

  var mongoUrl=( options && options.reporterOption && options.reporterOption.url ) || process.env['MONGOURL'];
  debug("connecting to %s", mongoUrl);

  if(!(this instanceof mocha_mongo_reporter)) {
    return new mocha_mongo_reporter(runner);
  }

  mongo.MongoClient.connect(mongoUrl, function(err, _db) {
    if(err) {
      mongoConnect.reject(err);
      throw err;
    }
    debug("connected to mongo");
    mongoConnect.resolve({});
    db = _db;
  });

  runner.on('pass', function(test){
    now=new Date();
    meta.timestamp=dateFormat(now, "isoDateTime", true);
    passes.push({ 
      suite:test.fullTitle().match(new RegExp("(.*) "+test.title))[1], 
      test:test.title, 
      duration:test.duration, 
      pass:true, 
      meta:meta
    });
  });

  runner.on('fail', function(test, err){
    now=new Date();
    meta.timestamp=dateFormat(now, "isoDateTime", true);
    failures.push({
      suite:test.fullTitle().match(new RegExp("(.*) "+test.title))[1], 
      test:test.title, 
      duration:test.duration, 
      pass:false, 
      err:err.message, 
      meta:meta
    });
  });

  runner.on('end', function(){
    debug("runner.end");
    runnerEnd.resolve({});
  });

  Q.all([runnerEnd.promise, mongoConnect.promise]).then( updateDB, function onRejectedPromise() {
    debug("error connecting to mongo");
  });

  function updateDB() {
    var allDeferreds=[];
    debug("updating db, %s %s", passes, failures);
    passes.concat(failures).forEach(function saveTestResults(test) {
      var deferred=Q.defer();
      allDeferreds.push(deferred.promise);
      debug("testrun to insert: %s", JSON.stringify(test));
      if(options.meta===false)
        test.meta=undefined;
      db.collection("testruns").insert(test, function mongoInsertCallback(err, results) {
        if(err) deferred.reject(err);
        deferred.resolve(results);
      });
    });
    Q.all(allDeferreds).then(function allDBUpdatesDone() {
      db.close();
      process.exit(failures.length);
    }, function onDBErr(err) {
      debug("error saving to mongo: %j", err);
      db.close();
      process.exit(failures.length);
    });
  }
}
