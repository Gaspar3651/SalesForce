@isTest
public with sharing class FileUploaderClassTest {
    @isTest
    static void uploadFileTest(){
        Case caso = new Case();
        insert caso;

        Test.startTest();
            String retorno = FileUploaderClass.uploadFile('Base64Test', 'FileName', caso.Id);
        Test.stopTest();
        System.AssertNotEquals(null, retorno);
    }
    @isTest
    static void removeFileTest(){
        Case caso = new Case();
        insert caso;

        String retorno = FileUploaderClass.uploadFile('Base64Test', 'FileName', caso.Id);

        Test.startTest();
            FileUploaderClass.removeFiles(caso.Id);
        Test.stopTest();
        List<Case> getListCase = [SELECT Id, (SELECT Id, CreatedDate FROM CombinedAttachments) FROM Case WHERE Id =: caso.Id];
        System.AssertEquals(0, getListCase[0].CombinedAttachments.size());
    }
}