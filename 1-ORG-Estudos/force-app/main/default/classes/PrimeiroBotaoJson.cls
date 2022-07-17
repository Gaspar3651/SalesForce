// REST API EXTERNO
// PARA FAZER UM GET OU POST COM INFORMAÇÕES FORA DO SALESFORCE 


public with sharing class PrimeiroBotaoJson {

    // METODO GET
    public static ViaCepJson consultCep(String cepDigitado) {
        Http http = new Http();

        HttpRequest request = new HttpRequest();
        request.setEndpoint('https://viacep.com.br/ws/'+cepDigitado+'/json/');
        request.setMethod('GET');
        
        HttpResponse response = http.send(request);

        ViaCepJson results;
        
        if(response.getStatusCode() == 200) {

            results = (ViaCepJson) JSON.deserialize(response.getBody(), ViaCepJson.class);
            System.debug('RESULTS:');
            System.debug(results);

        }
        return results;
    }
}
