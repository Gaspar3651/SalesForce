@isTest
public with sharing class FileUploaderClassTest {
    @isTest
    static void FileUploaderTest(){
        List<String> listIdDelet = new List<String>();
        Account conta = new Account();
        conta.Name = 'Teste';
        insert conta;

        Test.startTest();
            String retornoUpload = FileUploaderClass.uploadFile('Base64Test', 'FileName', conta.Id);
            List<CombinedAttachment> retornoListaArquivos = FileUploaderClass.listFiles(conta.Id);
            
            for (CombinedAttachment item: retornoListaArquivos) {
                listIdDelet.add(item.Id);
            }
            FileUploaderClass.removeFiles(conta.Id, listIdDelet);
        Test.stopTest();

        System.AssertNotEquals(null, retornoUpload);
        System.AssertEquals(1, retornoListaArquivos.size());
    }
}