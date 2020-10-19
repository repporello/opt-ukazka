(function() {
    'use strict';

    angular
        .module(APP_MODULE_NAME)
        .config(zobrazenieVysledkovSpracovaniaStateProvider);

    zobrazenieVysledkovSpracovaniaStateProvider.$inject = ['$stateProvider'];

    function zobrazenieVysledkovSpracovaniaStateProvider($stateProvider) {
        $stateProvider
            .state('app.zobrazenieVysledkovSpracovania', {
                url: '/ZobrazenieVysledkovSpracovania?ZaznamId',
                templateUrl: 'app/view/app/AGOPT/zobrazenieVysledkovSpracovania/zobrazenieVysledkovSpracovania.view.html',
                controller: 'ZobrazenieVysledkovSpracovaniaController',
                controllerAs: 'vm',
                reloadOnSearch: false
            });
    }
})();
