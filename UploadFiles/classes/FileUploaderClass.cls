public with sharing class FileUploaderClass {
    @AuraEnabled
    public static void uploadMultipleFiles(List<String> listName, List<String> listBase64, Id recordId){
        Savepoint sp = Database.setSavepoint();
        
        try {
            for (integer i=0; i < listName.size(); i++) {
                uploadFile(listBase64[i], listName[i], recordId);
            }
        } catch (Exception e) {
            Database.rollback(sp);
            System.debug('ERROR: Método -> FileUploaderClass.uploadMultipleFiles: \n'+ e.getMessage());
        }
    }
    


    private static String uploadFile(String base64, String filename, String recordId) {

        ContentVersion cv = createContentVersion(base64, filename);
        ContentDocumentLink cdl = createContentLink(cv.Id, recordId);

        if (cv == null || cdl == null) { 
            return null; 
        }
        return cdl.Id;
    }


    @AuraEnabled
    public static void removeFiles(Id recordId, List<String> listaDelet){

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
                linkedentityid in (SELECT id FROM Account where id= :recordId)
        ];

        List<id> DocIdList = new List<id>();

        for(ContentDocumentLink cdl: ContentDocumentLinkList){
            DocIdList.add(cdl.contentdocumentid);
        }

        List<ContentDocument> ConDocList =[SELECT Id, CreatedBy.name , ContentSize, ParentId FROM ContentDocument WHERE Id IN :listaDelet];
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