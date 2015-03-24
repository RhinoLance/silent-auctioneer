angular.module('app', ['ngRoute'])

.config(function($routeProvider){

        $routeProvider

            .when('/stock', {
                templateUrl: 'templates/stock.html',
                controller: 'StockController'
            })

            .when( '/result', {
                templateUrl: 'templates/result.html',
                controller: 'ResultController'
            })

            .otherwise({
                templateUrl: 'templates/bids.html',
                controller: 'BidController'
            });

        ModDb.InitDb();

    })

    .controller('MainController', function($scope){
        $scope.message="home";
        $scope.wipeDb = function() {
            ModDb.ClearAll();
        }
    })

    .controller('BidController', function($scope){
        $scope.message="Bids";
    })

    .controller('StockController', function($scope){
        $scope.message="Stock";

        //$scope.stockList=[];
        ModDb.Execute('SELECT * FROM Stock', [])
            .then(function(resultSet){

                var maxId = 1;
                for( var cI=0; cI<resultSet.length; cI++ ) {
                    maxId = maxId > parseFloat(resultSet[cI].StockId) ? maxId : parseFloat(resultSet[cI].StockId);
                }

                $scope.$apply(function() {
                    $scope.stockList = resultSet;
                    $scope.maxId = maxId;
                    $scope.resetNewStock();
                });

            })
            .catch(function(err){
                alert("There was an error:" + err.message);
            });

        $scope.resetNewStock = function() {

            $scope.newStock = {
                StockId: ++$scope.maxId,
                Description: '',
                Units: 1,
                Reserve: ''
            };
        };

        $scope.addStockItem = function() {


            ModDb.Execute(
                'INSERT INTO Stock VALUES(?, ?, ?, ?)',
                [$scope.newStock.StockId, $scope.newStock.Description, $scope.newStock.Units, $scope.newStock.Reserve]
            )
            .then(function() {
                $scope.$apply(function() {
                    $scope.stockList.push($scope.newStock);
                    $scope.resetNewStock();
                })

                var element = document.getElementById('inputDescription');
                if(element)
                    element.focus();
            })
            .catch(function(err) {
               alert('There was a problem saving this stock item.\n' + err.message);
            });

        }

        $scope.removeStockItem = function(id){

            ModDb.Execute(
                'DELETE FROM Stock WHERE StockId = ?',
                [id]
            )
            .then(function() {
                for( var cI=0; cI<$scope.stockList.length; cI++ ) {
                    if( id == $scope.stockList[cI].StockId){
                            $scope.$apply(function() {
                            $scope.stockList.splice(cI, 1);
                        })
                    }
                }
            })
            .catch(function(err) {
                alert('There was a problem deleting this stock item.\n' + err.message);
            });


        }
    })

    .controller('ResultController', function($scope){
        $scope.message="Result";
    });
