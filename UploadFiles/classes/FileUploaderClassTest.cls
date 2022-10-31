@isTest
public with sharing class FileUploaderClassTest {
    @isTest
    static void FileUploaderTest(){
        List<String> listIdDelet = new List<String>();
        List<String> listName = new List<String>();
        List<String> listName2 = new List<String>();
        List<String> listBase64 = new List<String>();

        listBase64.add('Base64Test');
        listName.add('FileName');

        Account conta = new Account();
        conta.Name = 'Teste';
        insert conta;

        Test.startTest();
            FileUploaderClass.uploadMultipleFiles(listBase64, listName, conta.Id);
            FileUploaderClass.uploadMultipleFiles(listBase64, listName2, conta.Id);

            List<CombinedAttachment> retornoListaArquivos = FileUploaderClass.listFiles(conta.Id);
            
            for (CombinedAttachment item: retornoListaArquivos) {
                listIdDelet.add(item.Id);
            }
            FileUploaderClass.removeFiles(conta.Id, listIdDelet);
        Test.stopTest();

        System.AssertEquals(1, retornoListaArquivos.size());
    }
}