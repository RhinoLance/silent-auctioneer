function ModDb() {}

g_oDb = null;

ModDb.dbInitDeferred = null;
ModDb.dbState = {
    opened: false,
    init: false
};


ModDb.Counter = 0;

ModDb.OpenDb = function(db) {
    //console.log("ModDb.OpenDb count:" + (++ModDb.Counter));

    if (db) {
        var deferred = Q.defer();
        deferred.resolve(db);
        return deferred.promise;
    }


    if (ModDb.dbInitDeferred !== null) {

        if (ModDb.dbState.init ) {
            ModDb.dbInitDeferred.resolve(g_oDb);
        }
        return ModDb.dbInitDeferred.promise;
    }

    ModDb.dbInitDeferred = Q.defer();

    if (g_oDb=== null) {

        var oDb = null;

        try {
            //console.log("Trying native db");
            oDb = window.sqlitePlugin.openDatabase("/storage/sdcard0/SilentAuctioneer");
        }
        catch (ex) {
            //console.log("Trying webkit db");
            oDb = window.openDatabase("SilentAuctioneer", "1.0", "SilentAuctioneer", 50 * 1024 * 1024); //50MB
        }

        g_oDb = oDb;

        ModDb.dbState.opened = true;

        ModDb.InitDb(oDb, function () {
            ModDb.dbState.init = true;
            ModDb.dbInitDeferred.resolve(g_oDb);
        });

    }
    else {
        ModDb.dbInitDeferred.resolve(g_oDb);
    }

    return ModDb.dbInitDeferred.promise;



};

ModDb.InitDb = function (oDb, fCallback) {

    oDb = oDb || g_oDb;

    var sStockSql = "CREATE TABLE IF NOT EXISTS Stock(" +
        " StockId INTEGER PRIMARY KEY, " +
        " Description TEXT, " +
        " Units INTEGER, " +
        " Reserve REAL " +
        ");";

    var sBidderSql = "CREATE TABLE IF NOT EXISTS Bidders(" +
        " BidderId INTEGER PRIMARY KEY, " +
        " Description TEXT, " +
        " Phone INTEGER " +
        ");";


    var sBidSql = "CREATE TABLE IF NOT EXISTS Bids(" +
        " BidId TEXT PRIMARY KEY, " +
        " BidderId INTEGER, " +
        " StockId INTEGER, " +
        " Amount REAL " +
        ");";


    //Create Stock table
    ModDb.ExecuteSql(sStockSql, [], null, oDb)

        //Create Inspections table
        .then(function () { ModDb.ExecuteSql(sBidderSql, [], null, oDb); })
        .then(function () { ModDb.ExecuteSql(sBidSql, [], null, oDb); })
        .then(fCallback)
        .catch(function (err) {
            console.error('Create table error: ' + err);
            alert('There was an error initialising the database.');
            fCallback(err);
        });
};

ModDb.Query = function (sSql, fSuccessCallback, fFailureCallback, db) {
    ModDb.QueryParams(sSql, [], fSuccessCallback, fFailureCallback, db)
};

ModDb.QueryParams = function (sSql, aParams, fSuccessCallback, fFailureCallback, db) {

    var a = function( sSql, fSuccessCallback, fFailureCallback, db ) {

        ModDb.OpenDb(db)
            .then(function (db) {

                db.transaction(function (tx) {
                    //console.log("ModDb.Query: " + sSql);
                    tx.executeSql(
                        sSql,
                        aParams,
                        function (tx, result) {
                            //console.log("ModDb.Query success");
                            var aResultSet = [];

                            for (var cI = 0; cI < result.rows.length; cI++) {
                                //console.log(JSON.stringify(result.rows.item(cI)));
                                aResultSet.push(result.rows.item(cI));
                            }
                            fSuccessCallback(aResultSet);
                        },
                        function (tx, error) {
                            console.warn("ModDb.Query failure: " + JSON.stringify(error) + "\n" + sSql);
                            //alert("ModDb.Query failure: " + JSON.stringify(error));
                            fFailureCallback(error);
                        });
                });
            });
    }(sSql, fSuccessCallback, fFailureCallback, db);
};

ModDb.ClearAll = function () {

    ModDb.ExecuteSql("DROP TABLE Stock", [], null, g_oDb)
        .then(function() {
            ModDb.ExecuteSql("DROP TABLE Bids", [], null, g_oDb)
        })
        .then(function() {
            ModDb.ExecuteSql("DROP TABLE Bidders", [], null, g_oDb)
        })
        .then(function() {
            //Rebuild tables
            ModDb.InitDb();
        })
        .catch(function(err) {
            console.error('Clear table error: ' + err);
            alert('There was an error clearing the database.');
        });



};

ModDb.ExecuteSql = function (sql, aParams, tx, db) {

    console.log(sql);

    var deferred = Q.defer();

    if (tx) {
        tx.executeSql(sql, aParams || [],
            function (tx, result) {
                deferred.resolve(tx, result);
            },
            function (tx, err) {
                deferred.reject(err);
            });
    }
    else {

        ModDb.QueryParams(sql, [],
            function (resultSet) {
                deferred.resolve(resultSet);
            },
            function (err) {
                deferred.reject(err);
            },
            db);

    }

    return deferred.promise;

};

ModDb.Execute = function (sSql, aParams) {

    console.log(sSql);

    var deferred = Q.defer();

    ModDb.OpenDb(g_oDb)
        .then(function (g_oDb) {

            g_oDb.transaction(function (tx) {
                //console.log("ModDb.Query: " + sSql);
                tx.executeSql(
                    sSql,
                    aParams,
                    function (tx, result) {
                        //console.log("ModDb.Query success");
                        var aResultSet = [];

                        for (var cI = 0; cI < result.rows.length; cI++) {
                            //console.log(JSON.stringify(result.rows.item(cI)));
                            aResultSet.push(result.rows.item(cI));
                        }
                        deferred.resolve(aResultSet);
                    },
                    function (tx, error) {
                        console.warn("ModDb.Query failure: " + JSON.stringify(error) + "\n" + sSql);
                        //alert("ModDb.Query failure: " + JSON.stringify(error));
                        deferred.reject(error);
                    });
            });
        });

    return deferred.promise;

};