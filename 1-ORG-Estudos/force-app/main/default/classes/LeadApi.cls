// REST API INTERNO
// PARA FAZER UM GET OU POST COM INFORMAÇÕES DENTRO DO SALESFORCE


@RestResource(urlMapping='/EventoComunidade/Leads/*')
global with sharing class LeadApi {
    // METODO GET
    @HttpGet
    global static void getLeads(){
        RestResponse resultRest = RestContext.response;
        
        List<Lead> leadsList = [SELECT Id, Name, Phone, Email FROM Lead];
        
        resultRest.responseBody = Blob.valueOf(JSON.serialize(leadsList));
        resultRest.statusCode = 200;
    }
    
    // METODO POST
    @HttpPost
    global static void insertLeads(List<LeadInsertWrapper> leadList){
        RestResponse resultRest = RestContext.response;
        List<Lead> listInsert = new List<Lead>();

        for (LeadInsertWrapper item : leadList) {
            Lead leadInsert = new Lead(
                LastName = item.sobreNome,
                Company = item.nomeEmpresa,
                Status = item.statusLead,
                Email = item.email,
                FirstName = item.nome
            );
            listInsert.add(leadInsert);
        }
        
        List<String> idsResponse = new List<String>();

        if(listInsert.size() > 0){
            Database.UpsertResult[] results = Database.upsert(listInsert);

            for(Integer i=0; i<results.size(); i++){
                if (results[i].isSuccess()) {
                    idsResponse.add(results[i].Id);
                } else {
                    idsResponse.add('ERRO');
                }
            }
        }

        resultRest.responseBody = Blob.valueOf(JSON.serialize(idsResponse));
        resultRest.statusCode = 200;
    }
}
