/* 
permite fazer upload de um arquivo no Salesforce fornecendo uma string base64 do arquivo, um nome para o arquivo e o ID do registro que você deseja anexar o arquivo

EXEMPLO:
FileUploaderClass.uploadFile(myBase64String, 'Invoice.pdf', '906F0000000kG2UIAU');
*/
public with sharing class FileUploaderClass {
    @AuraEnabled
    public static String uploadFile(String base64, String filename, String recordId) {

        ContentVersion cv = createContentVersion(base64, filename);
        ContentDocumentLink cdl = createContentLink(cv.Id, recordId);

        if (cv == null || cdl == null) { 
            return null; 
        }
        return cdl.Id;
    }


    @AuraEnabled
    public static void removeFiles(Id recordId){
        Set<Id> arquivoId = new Set<Id>();
        Date hj = System.now().date();

        List<Account> getListAccount = [SELECT Id, (SELECT Id, CreatedDate FROM CombinedAttachments) FROM Account WHERE Id =: recordId];
        List<Account> listAccount = new List<Account>();

        for(Account item: getListAccount){
            
            for(CombinedAttachment att : item.CombinedAttachments){
                Date comp = att.CreatedDate.date();
                
                if (comp == hj) {
                    arquivoId.add(att.id);
                }
            }
        }


        List<ContentDocumentLink> ContentDocumentLinkList =[
            SELECT 
                id,
                contentdocumentid, 
                linkedentity.name,
                linkedentityid,
                linkedentity.type 
            FROM 
                ContentDocumentLink 
            WHERE 
                linkedentityid in (SELECT id FROM Account where id= :recordId)];

        List<id> DocIdList = new List<id>();

        for(ContentDocumentLink cdl: ContentDocumentLinkList){
            DocIdList.add(cdl.contentdocumentid);
        }

        List<ContentDocument> ConDocList =[SELECT Id, CreatedBy.name , ContentSize, ParentId FROM ContentDocument WHERE Id IN :arquivoId];
        delete ConDocList;
    }
    

    @AuraEnabled
    public static List<CombinedAttachment> listFiles(Id recordId){
        Set<Id> arquivoId = new Set<Id>();

        List<Account> getListAccount = [SELECT Id, (SELECT id, Title FROM CombinedAttachments) FROM Account WHERE Id =: recordId];
        List<CombinedAttachment> listReturn = new List<CombinedAttachment>();

        for(Account item: getListAccount){
            for(CombinedAttachment att : item.CombinedAttachments){
                listReturn.add(att);
            }
        }
        return listReturn;
    }
    
    
    private static ContentVersion createContentVersion(String base64, String filename) {
        ContentVersion cv = new ContentVersion();
        cv.VersionData = EncodingUtil.base64Decode(base64);
        cv.Title = filename;
        cv.PathOnClient = filename;


          insert cv;
          return cv;
    }

    private static ContentDocumentLink createContentLink(String contentVersionId, String recordId) {
        if (contentVersionId == null || recordId == null) { return null; }
        ContentDocumentLink cdl = new ContentDocumentLink();
        cdl.ContentDocumentId = [
            SELECT 
                ContentDocumentId 
            FROM 
                ContentVersion 
            WHERE
                Id =: contentVersionId].ContentDocumentId;

        cdl.LinkedEntityId = recordId;
        // ShareType is either 'V', 'C', or 'I'
        // V = Viewer, C = Collaborator, I = Inferred
        cdl.ShareType = 'V';
        
        insert cdl;
        return cdl;
    }
}