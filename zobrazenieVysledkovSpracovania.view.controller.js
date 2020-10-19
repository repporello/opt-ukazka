(function() {
    'use strict';

    angular
        .module(APP_MODULE_NAME)
        .controller('ZobrazenieVysledkovSpracovaniaController', zobrazenieVysledkovSpracovaniaController);

    zobrazenieVysledkovSpracovaniaController.$inject = ['$scope', '$filter', 'ApiEnumService', 'ApiOptService', 'AlertModal', 'VseobecnyModal', '$state', 'toastr', 'dateFilter', 'AclService'];

    function zobrazenieVysledkovSpracovaniaController($scope, $filter, ApiEnumService, ApiOptService, AlertModal, VseobecnyModal, $state, toastr, dateFilter, AclService) {
        /* jshint validthis: true */
        var vm = this;

        vm.pristupPovoleny = AclService.isAllowed('administrator-idc');

        if (!vm.pristupPovoleny) {

            toastr.error('Prístup bol zamietnutý.');
            $state.go(
                'app.dashboard',
                {notify: false, reloadOnSearch: false, reload: false, location: 'replace', inherit: true}
            );

        } else {

            // deklaracie premennych
            vm.vyhladavanie = {
                poskodene: true,
                novonarodeni: true,
                zmenaUdajov: true,
                manualneZadane: true,
                stratene: true,
                inicialne: true,
                okresyAdresata: [],
                vsetkyOkresy: false
            };

            vm.okresyNastavenia = {
                displayProp: 'NA',
                idProp: '_ID',
                styleActive: true,
                keyboardControls: true,
                enableSearch: true,
                scrollable: true,
                buttonClasses: 'form-control',
                scrollableHeight: '300px'
            };

            vm.okresyPreklady = {
                checkAll: 'Označiť všetky',
                uncheckAll: 'Odznačiť všetky',
                buttonDefaultText: 'Vybrať okresy',
                selectionCount: '(vybraté)',
                dynamicButtonTextSuffix: '(vybraté)',
                searchPlaceholder: 'Vyhľadať'
            };

            vm.ciselnikVysledkySpracovania = [
                '',
                'Bez chyby',
                'Nie je možné vytvoriť doklad',
                'Duplicitná požiadavka',
                'Dosiahnutý limit pre okres',
                'Existuje novšia žiadosť',
                'Nedovolený stav OPT',
                'Chybná žiadosť',
                'Kontrola osoby'
            ];

            vm.ciselnikSposobyVybavenia = [
                '',
                'Oprava údajov',
                'Manuálne zadaná žiadosť',
                'Vyradená zo spracovania'
            ];

            vm.zoznamSpracovanychDavok = [];
            vm.zoznamSpracovanychFront = [];
            vm.zoznamSpracovanychZaznamov = [];
            vm.oznacenaDavka = false;
            vm.zaznamovNaStranku = 20;

            // funckie
            vm.naplnitCiselniky = naplnitCiselniky;
            vm.vymazatVyhladavanie = vymazatVyhladavanie;
            vm.vyhladat = vyhladat;
            vm.validovatVyhladavanie = validovatVyhladavanie;
            vm.vybratFilter = vybratFilter;
            vm.zrusitFilter = zrusitFilter;
            vm.oznacitDavku = oznacitDavku;
            vm.oznacitFrontu = oznacitFrontu;
            vm.vybratOsobu = vybratOsobu;
            vm.zmazatOsobu = zmazatOsobu;
            vm.zobrazitDetailOsoby = zobrazitDetailOsoby;
            vm.zobrazitDetailDokladu = zobrazitDetailDokladu;
            vm.zobrazitDetailZiadosti = zobrazitDetailZiadosti;
            vm.ukoncitObrazovku = ukoncitObrazovku;
            vm.zapisatVybavenie = zapisatVybavenie;

            // INIT
            vm.naplnitCiselniky();

        }

        // FUNKCIE
        function naplnitCiselniky() {
            ApiEnumService.getEnums({
                UCE: {TU: 2}
            }).then(
                function(data) {

                    vm.ciselniky = {
                        okresy: data.getArray('TransEnv.UCEList.UCE')
                    };

                    vm.zobrazeneCiselniky = {
                        okresy: $filter('LocaleSortFilter')(vm.ciselniky.okresy, 'NA')
                    };

                }
            );
        }

        function validovatVyhladavanie() {

            if (vm.zobrazeneCiselniky && vm.vyhladavanie.okresyAdresata.length === vm.zobrazeneCiselniky.okresy.length) {
                vm.vyhladavanie.vsetkyOkresy = true;
            } else {
                vm.vyhladavanie.vsetkyOkresy = false;
            }
            // vymazat vysledky
            vm.zoznamSpracovanychDavokZdroj = [];
            vm.zoznamSpracovanychFrontZdroj = [];
            vm.zoznamSpracovanychZaznamovZdroj = [];
            vm.zobrazenyFilter = false;
            vm.chybaVyhladavania = '';

            if (vm.vyhladavanie.datumOd) {
                var jdDatumOd = $filter('jsDateTimeFilter')(vm.vyhladavanie.datumOd);
                if (!jdDatumOd ||
                    dateFilter(jdDatumOd, 'dd.MM.yyyy HH:mm') !== vm.vyhladavanie.datumOd) {
                    vm.chybaVyhladavania = '"Dátum a čas spustenia od" nie je v správnom formáte.';
                    return;
                }
            }

            if (vm.vyhladavanie.datumDo) {
                var jdDatumDo = $filter('jsDateTimeFilter')(vm.vyhladavanie.datumDo);
                if (!jdDatumDo ||
                    dateFilter(jdDatumDo, 'dd.MM.yyyy HH:mm') !== vm.vyhladavanie.datumDo) {
                    vm.chybaVyhladavania = '"Dátum a čas spustenia do" nie je v správnom formáte.';
                    return;
                }
            }

            vyhladat();
        }

        // definica funkcii

        function vymazatVyhladavanie() {
            vm.vyhladavanie = {
                datumOd: '',
                datumDo: '',
                poskodene: true,
                novonarodeni: false,
                zmenaUdajov: false,
                manualneZadane: false,
                stratene: false,
                inicialne: false,
                okresyAdresata: [],
                vsetkyOkresy: false
            };

            vm.zoznamSpracovanychDavokZdroj = [];
            vm.zoznamSpracovanychFrontZdroj = [];
            vm.zobrazenyFilter = false;
            vm.chybaVyhladavania = '';
            vm.oznacenaDavka = undefined;
            vm.oznacenaFronta = undefined;
        }

        // spusti vyhladavanie a automaticky oznaci prvu davku
        function vyhladat() {

            /**
             * @param data struktura s datami, vid ukazka nizsie
             * Ukazka data:
             {
                SDA: { // OPT.T_SPUSTENA_DAVKA
                    ZS: '2009-05-16T14:42:28', //Dátum a čas spustenia generovania.
                    KS: '2003-08-09T02:18:37+02:00', //Dátum a čas konca generovania.
                    KZA: { // OPT.T_KONFIGURACNY_ZAZNAM
                        'GB': 'false', //Určuje či v rámci dávky budú generované žiadosti o opt pre novo narodených občanov, občanov ktorí získali bydlisko na území SR a obyvateľov ktorí získali občianstvo SR a majú trvalý pobyt na území SR.
                        'GP': 'false', //Identifikuje či v rámci dávky budú generované žiadosti o vydanie nových OPT pre občanov ktorým sa zmenili údaje uvádzané na OPT.
                        'GO': 'false', //Príznak či budú do Objednávky OPT zahrnuté požiadavky na výrobu OPT podľa manuálne zadaných žiadostí.
                        'GJ': 'false', //Identifikuje či v rámci dávky budú automaticky generované žiadosti o vydanie OPT ako náhrady za stratené, odcudzené a nájdené OPT.
                        'GR': 'true'   //Identifikuje či v rámci dávky budú generované žiadosti o vydanie OPT pre občanov spĺňajúcich požiadavky na vydanie OPT ktorým ešte OPT nebol vydaný.
                    },
                    'UCEList':  [
                            { //CIS.REG_UZEMNY_CELOK - Obec v súlade s číselníkom ŠÚ SR č.0025 Lokálne štatistické územné jednotky, Okres v súlade s číselníkom ŠÚ SR č.0024 Lokálne štatistické územné jednotky, Kraj v súlade s číselníkom ŠÚ SR č.0049 Kraje, časť obce
                            'ID': '3' //Jedinečný identifikátor objektu
                            }
                        ]
                    }
                }
             }
             */

            var parametreVyhladavania = {
                SDA: { // OPT.T_SPUSTENA_DAVKA
                    ZS: $filter('serverDateTimeFilter')(vm.vyhladavanie.datumOd), //Dátum a čas spustenia generovania.
                    KS: $filter('serverDateTimeFilter')(vm.vyhladavanie.datumDo, 59), //Dátum a čas konca generovania.
                    KZA: { // OPT.T_KONFIGURACNY_ZAZNAM
                        GB: vm.vyhladavanie.novonarodeni, //Určuje či v rámci dávky budú generované žiadosti o opt pre novo narodených občanov, občanov ktorí získali bydlisko na území SR a obyvateľov ktorí získali občianstvo SR a majú trvalý pobyt na území SR.
                        GP: vm.vyhladavanie.zmenaUdajov, //Identifikuje či v rámci dávky budú generované žiadosti o vydanie nových OPT pre občanov ktorým sa zmenili údaje uvádzané na OPT.
                        GO: vm.vyhladavanie.manualneZadane, //Príznak či budú do Objednávky OPT zahrnuté požiadavky na výrobu OPT podľa manuálne zadaných žiadostí.
                        GJ: vm.vyhladavanie.stratene, //Identifikuje či v rámci dávky budú automaticky generované žiadosti o vydanie OPT ako náhrady za stratené, odcudzené a nájdené OPT.
                        GR: vm.vyhladavanie.inicialne   //Identifikuje či v rámci dávky budú generované žiadosti o vydanie OPT pre občanov spĺňajúcich požiadavky na vydanie OPT ktorým ešte OPT nebol vydaný.
                    }
                }
            };

            if (!vm.vyhladavanie.vsetkyOkresy) {

                parametreVyhladavania['SDA']['UCEList'] = [];
                _.each(vm.vyhladavanie.okresyAdresata, function (okres) {
                        parametreVyhladavania['SDA']['UCEList'].push({ID: okres.id});
                });
            }

            //console.log('parametre', parametreVyhladavania);

            ApiOptService.optWsZoznamSpracovanychDavok(parametreVyhladavania).then(
                function (response) {

                    var vysledky, kod, text;

                    vysledky = response.getArray('TransEnv.MSG.SDAList.SDA');
                    kod = response.get('TransEnv.MSG.CO');
                    text = response.get('TransEnv.MSG.TE');

                    if (vysledky && kod === '1') {

                        // console.log('odpoved', vysledky);
                        vyplnitUdaje(vysledky);

                    } else {

                        var chybaWS = AlertModal.alert(kod + ' - ' + text);
                        chybaWS.show();

                    }
                });
        }

        function vyplnitUdaje(udaje) {

            //onsole.log('udaje', udaje);

            vm.zoznamSpracovanychDavokZdroj = _.map(udaje, function (data) {

                var davka = {
                    check: false,
                    id: data.get('_ID'),
                    zaciatokSpracovania: data.get('ZS'),
                    koniecSpracovania: data.get('KS'),
                    spracovaneZaznamy: data.get('PS'),
                    vygenerovaneZiadosti: data.get('PV'),
                    novonarodeni: data.get('KZA.GB'),
                    stratene: data.get('KZA.GJ'),
                    zmenaUdajov: data.get('KZA.GP'),
                    inicialne: data.get('KZA.GR'),
                    manualneZadane: data.get('KZA.GO'),
                    datumNarodeniaOd: data.get('KZA.DA'),
                    datumNarodeniaDo: data.get('KZA.DR'),
                    maxPocet: data.get('KZA.MP')
                };

                davka.fronty = _.map(data.getArray('SFXList.SFX'), function (fronty) {

                    var parametre;

                    if (fronty.get('TFRTFNA') === 'Fronta Iniciálna dávka') {
                        parametre = davka.datumNarodeniaOd ? $filter('date')(davka.datumNarodeniaOd, 'dd.MM.yyyy') : '';
                        parametre += ' - ';
                        parametre += davka.datumNarodeniaDo ? $filter('date')(davka.datumNarodeniaDo, 'dd.MM.yyyy') : '';
                    } else {
                        parametre = '';
                    }

                    return {
                        check: false,
                        id: fronty.get('_ID'),
                        typFronty: fronty.get('TFRTFNA'),
                        parametreFronty: parametre,
                        zaciatokSpracovania: fronty.get('ZS'),
                        koniecSpracovania: fronty.get('KS'),
                        spracovaneZaznamy: fronty.get('PS'),
                        vygenerovaneZiadosti: fronty.get('VP'),
                        poziadaviekVoFronte: fronty.get('PD')
                    };
                });

                return davka;
            });

            vm.zoznamSpracovanychDavok = vm.zoznamSpracovanychDavokZdroj;

            if (vm.zoznamSpracovanychDavok) {
                vm.oznacitDavku(vm.zoznamSpracovanychDavok[0],vm.zoznamSpracovanychDavok);
            }

            vm.zobrazenyFilter = true;
        }

        // oznacenie riadku po kliknuti
        function oznacitDavku(row, rows) {

            vm.oznacenaDavka = undefined;

            if (row.check === true) {
                row.check = false;
            } else {
                row.check = true;
                angular.forEach(rows, function(r){
                    if(row.id !== r.id) {
                        r.check = false;
                    } else {
                        vm.oznacenaDavka = row;
                    }
                });
            }

            if (vm.oznacenaDavka) {
                vm.zoznamSpracovanychFrontZdroj =  vm.oznacenaDavka.fronty;

            } else {
                vm.zoznamSpracovanychFrontZdroj = [];
            }

            vm.zoznamSpracovanychFront = vm.zoznamSpracovanychFrontZdroj;

            // oznacit frontu prisluchajucu k davke
            if (vm.oznacenaDavka) {
                if (vm.zoznamSpracovanychFront.length > 0) {
                    vm.zoznamSpracovanychFrontZdroj[0].check = false;
                    vm.oznacitFrontu(vm.zoznamSpracovanychFront[0], vm.zoznamSpracovanychFront);
                } else {
                    vm.oznacenaFronta = undefined;
                }
            }

            zrusitFilter();
            nastavitFilter();
        }

        // oznacenie riadku po kliknuti
        function oznacitFrontu(row, rows) {

            vm.oznacenaFronta = undefined;

            if (row.check === true) {
                row.check = false;
            } else {
                row.check = true;
                angular.forEach(rows, function(r){
                    if(row.id !== r.id) {
                        r.check = false;
                    } else {
                        vm.oznacenaFronta = row;
                    }
                });
            }

            zrusitFilter();
            nastavitFilter();

        }

        function  nastavitFilter() {

            $scope.$watch('vm.filter.ibaVybavene', function () {
                if (vm.filter.ibaVybavene) {
                    vm.filter.ibaNevybavene = false;
                }
            });

            $scope.$watch('vm.filter.ibaNevybavene', function () {
                if (vm.filter.ibaNevybavene) {
                    vm.filter.sposobVybavenia = '';
                    vm.filter.ibaVybavene = false;
                } else {
                    vm.filter.sposobVybavenia = '';
                }
            });

            $scope.$watch('vm.filter.vysledokSpracovania', function () {
                if (vm.filter.vysledokSpracovania === 'Bez chyby') {
                    vm.filter.sposobVybavenia = '';
                    vm.filter.ibaVybavene = false;
                    vm.filter.ibaNevybavene = false;
                    vm.filterDisabledVybavenie = true;
                } else {
                    vm.filterDisabledVybavenie = false;
                }
            });
        }

        function vybratOsobu () {

            // vyhladanie osoby
            var modalOptions = {
                title: 'Vyhľadanie osoby',
                content: 'vyhladanieOsoby/vyhladanieOsoby.view.html',
                controller: 'VyhladanieOsobyController',
                reloadOnHide: false,
                locals: {
                    vybratOsobu: function (osoba) {

                        vm.filterVybrataOsoba = osoba;
                        if (osoba.meno || osoba.priezvisko || osoba.rodnePriezvisko) {
                            vm.filter.osoba = osoba.meno + ' ' + osoba.priezvisko + ', ' + osoba.rodnePriezvisko + ', ' + osoba.rodneCislo;
                        }
                    }
                }
            };

            VseobecnyModal.modal(modalOptions).show();
        }

        function zmazatOsobu() {
            vm.filterVybrataOsoba = null;
            vm.filter.osoba = '';
        }

        function zrusitFilter() {
            vm.zmazatOsobu();
            vm.filter = {
                osoba: '',
                vysledokSpracovania: '',
                sposobVybavenia: '',
                ibaVybavene: false,
                ibaNevybavene: false,
                vCelejHistorii:false
            };
            vm.zoznamSpracovanychZaznamov = [];
        }

        function vybratFilter(znamienko) {

            vm.zoznamSpracovanychZaznamovZdroj = [];

            if (znamienko === '+') {
                vm.cisloStranky++;
            } else if (znamienko === '-') {
                vm.cisloStranky--;
            } else {
                vm.cisloStranky = 1;
            }

            var parametrePreFilter = {
                'SZI': { //OPT.T_SPRACOVANY_ZAZNAM_IN
                    'VS': vm.filter.vysledokSpracovania, //Označenie výsledku spracovania.
                    'VY': vm.filter.ibaVybavene, //Ak TRUE, tak T_SPRACOVANY_ZAZNAM.LV_VYBAVENE = true
                    'IV': vm.filter.ibaNevybavene, //Ak TRUE, tak T_SPRACOVANY_ZAZNAM.LV_VYBAVENE = false
                    'SV': vm.filter.sposobVybavenia, //Spôsob vybavenia chyby spracovania napr.: Oprava údajov; Manuálne zadaná žiadosť; Vyradená zo spracovania.
                    'STR': {  //OPT.T_STRANKOVANIE
                        'PZ': vm.zaznamovNaStranku, //Urcuje, kolko záznamov sa má zobrazit na jedne stránke
                        'CS': vm.cisloStranky //Poradové císlo stránky , z ktorej sa majú vrátit záznamy.
                        }
                    }
                };

            if (vm.filter.vCelejHistorii) {
                parametrePreFilter['SZI']['SF'] = null;
            } else {
                parametrePreFilter['SZI']['SF'] = vm.oznacenaFronta.id;
            }

            if (vm.filterVybrataOsoba) {
                parametrePreFilter['SZI']['IS'] = vm.filterVybrataOsoba.id;
            }

            ApiOptService.optWsZoznamSpracovanychZaznamov(parametrePreFilter).then(
                function (response) {

                    var vysledky, kod, text;

                    vysledky = response.getArray('TransEnv.MSG.SZOList.SZO');
                    kod = response.get('TransEnv.MSG.CO');
                    text = response.get('TransEnv.MSG.TE');

                    if (vysledky && kod === '1') {
                        vyplnitZoznamSpracovanychZaznamov(vysledky);

                    } else {

                        var chybaWS = AlertModal.alert(kod + ' - ' + text);
                        chybaWS.show();

                    }
                }
            );
        }

        function vyplnitZoznamSpracovanychZaznamov (udaje) {

            vm.zoznamSpracovanychZaznamovZdroj = _.map(udaje, function (data) {

                var zaznam = {
                    id: data.get('_ID'),
                    uid: data.get('_UID'),
                    check: false,
                    osoba: data.get('OS'),
                    osobaId: data.get('OSO.ID'),
                    vysledokSpracovania: data.get('VS'),
                    vybavene: $filter('logickaHodnotaZoServera')(data.get('VY')),
                    vybavenePovodne: $filter('logickaHodnotaZoServera')(data.get('VY')),
                    informaciaOSpracovani: data.get('IO'),
                    sposobVybavenia: data.get('SV'),
                    sposobVybaveniaPovodne: data.get('SV'),
                    zahajenieSpracovnia: data.get('ZS'),
                    ziadost: data.get('ZIA._ID'),
                    cisloDokladu: data.get('DOP._ID'),
                    opravnenie: $filter('logickaHodnotaZoServera')(data.get('OP'))
                };

                return zaznam;
            });

            vm.zoznamSpracovanychZaznamov = vm.zoznamSpracovanychZaznamovZdroj;
        }

        // zobraz detail osoby
        function zobrazitDetailOsoby(id,e) {

            // nastavenia hlavneho modalu s detailom osoby
            var modalOptions = {
                title: 'Detail osoby',
                content: 'osobaDetail/osobaDetail.view.html',
                controller: 'OsobaDetailController',
                reloadOnHide: false
            };

            if (id) {
                VseobecnyModal.modal(modalOptions, id);
            }

            e.stopPropagation();
        }

        // zobraz detail ziadosti
        function zobrazitDetailZiadosti(id,e) {
            var modalOptions = {
                title: 'Detail žiadosti o vydanie OP bez podoby tváre',
                content: 'ziadostOVydanieDokladuDetail/ziadostOVydanieDokladuDetail.view.html',
                controller: 'ZiadostOVydanieDokladuDetailController',
                reloadOnHide: false
            };

            if (id) {
                VseobecnyModal.modal(modalOptions, id);
            }

            e.stopPropagation();
        }

        // zobraz detail dokladu
        function zobrazitDetailDokladu(id,e) {
            // console.log('zobraz detail dokladu c.' + id);
            var modalOptions = {
                title: 'Detail dokladu',
                content: 'dokladDetail/dokladDetail.view.html',
                controller: 'DokladDetailController',
                reloadOnHide: false
            };
            VseobecnyModal.modal(modalOptions, id);
            e.stopPropagation();
        }

        // zapisat vybavenie
        function zapisatVybavenie(zaznam,e) {

            var parametreZapisu = {
                'SZA': { //OPT.T_SPRACOVANY_ZAZNAM
                    'VY': zaznam.vybavene, //Príznak vybavenia položky ak spracovanie skončilo chybou.
                    'SV': zaznam.sposobVybavenia, //Spôsob vybavenia chyby spracovania napr.: Oprava údajov; Manuálne zadaná žiadosť; Vyradená zo spracovania.
                    'ID': zaznam.id, //Jedinečný identifikátor objektu
                    'UID': zaznam.uid //Jedinečný identifikátor verzie objektu
                }
            };

            ApiOptService.optWsZmenaSpracovanehoZaznamu(parametreZapisu).then(
                function (response) {
                    // console.log('vysledky WS zapisu:', response);

                    var vysledky = response.get('TransEnv.MSG');
                    var kod = response.get('TransEnv.MSG.CO');
                    var text = response.get('TransEnv.MSG.TE');

                    if (vysledky && kod === '1') {

                        //console.log('odpoved', vysledky);
                        toastr.success('Záznam bol úspešne uložený.');

                    } else {

                        var chybaWS = AlertModal.alert(kod + ' - ' + text);
                        chybaWS.show();

                    }
                }
            );
        }

        // navrat na uvodu stranku
        function ukoncitObrazovku() {
            $state.go(
                'app.dashboard',
                {notify: false, reloadOnSearch: false, reload: false, location: 'replace', inherit: true}
            );
        }

    }
})();
