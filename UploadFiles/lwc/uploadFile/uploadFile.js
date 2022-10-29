import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import uploadMultipleFiles from '@salesforce/apex/FileUploaderClass.uploadMultipleFiles';
import removeFiles from '@salesforce/apex/FileUploaderClass.removeFiles';
import listFiles from '@salesforce/apex/FileUploaderClass.listFiles';

class arquivos{
    Id;
    Name;
}

export default class UploadFile extends LightningElement {
    @api recordId;

    @track listBase64Upload = [];
    @track listNameUpload = [];
    
    @track listViewFiles = [];
    @track listViewFilesDelet = [];;
    listIdFilesDelet = [];
    
    labelBtn = "Listar Arquivos";
    viewFiles = false;
    spinner = false;

    textFiles = [];
    readFile(fileSource) {
        return new Promise((resolve, reject) => {
            const fileReader = new FileReader();
            const fileName = fileSource.name;
            fileReader.onerror = () => reject(fileReader.error);
            fileReader.onload = () => resolve({ fileName, base64: fileReader.result.split(',')[1]});
            fileReader.readAsDataURL(fileSource);
        });
    }
    async handleFileChange(event) {
        this.showSpinner();
        this.listBase64Upload = [];
        this.listNameUpload = [];

        this.textFiles = await Promise.all(
            [...event.target.files].map(file => this.readFile(file))
        );
         
        this.textFiles.forEach(item => {
            this.listBase64Upload.push(item.base64);
            this.listNameUpload.push(item.fileName);
        });   
        
        this.closeSpinner();
    }


    uploadMultipleFiles(){
        this.showSpinner();

        uploadMultipleFiles({
            listName: this.listNameUpload,
            listBase64: this.listBase64Upload,
            recordId: this.recordId
        }).then(()=>{
            this.refreshComponents()
            this.closeSpinner();
            this.showToast('Sucesso !', 'Arquivos enviados com sucesso', 'success');
        }).catch(error=>{
            console.log('uploadMultipleFiles ERROR: ' + error.body.message);
            this.showToast('ERRO', 'Ocorreu um erro ao enviar os arquivos.\n Por favor, tente mais tarde !', 'error');
        });
        
        
        if (this.viewFiles){
            this.listarArquivos();
        }
        
        this.textFiles = [];
    }

    listarArquivos(){
        this.viewFiles = !this.viewFiles;
        
        this.listViewFiles = [];
        this.listViewFilesDelet = [];
        this.listIdFilesDelet = [];

        if (this.viewFiles) {  
            this.labelBtn = "Ocultar Arquivos";
            this.showSpinner(); 
            listFiles({
                recordId: this.recordId
            }).then(result=>{
                result.forEach(item => {
                    let arq = new arquivos();
                    arq.Id = item.Id;
                    arq.Name = item.Title;
                    
                    this.listViewFiles.push(arq);
                    
                });

                this.closeSpinner();
            }).catch(error=>{
                console.log('listFiles ERROR: ' + error.body.message);
            });
        }else{
            this.labelBtn = "Listar Arquivos";
        }
    }


    selecionaArquivo(event){
        var titulo = event.target.title;
        var idSelecionado = event.target.value;

        let arq = new arquivos();
        arq.Id = idSelecionado;
        arq.Name = titulo;
        
        this.listViewFilesDelet.push(arq);
        
        this.listIdFilesDelet.push(idSelecionado);
        
        for (let i = 0; i < this.listViewFiles.length; i++) {
            if (this.listViewFiles[i].Id == idSelecionado) {
                this.listViewFiles.splice(i, 1);
                i = this.listViewFiles.length + 5;
            }
        }
    }    
    
    removeArquivoSelecionado(event){
        var titulo = event.target.title;
        var idSelecionado = event.target.value;

        let arq = new arquivos();
        arq.Id = idSelecionado;
        arq.Name = titulo;
        
        this.listViewFiles.push(arq);
        
        for (let i = 0; i < this.listViewFilesDelet.length; i++) {
            if (this.listViewFilesDelet[i].Id == idSelecionado) {
                this.listViewFilesDelet.splice(i, 1);

                i = this.listViewFilesDelet.length + 5;
            }
        }
        for (let i = 0; i < this.listIdFilesDelet.length; i++) {
            if (this.listIdFilesDelet[i] == idSelecionado) {
                this.listIdFilesDelet.splice(i, 1);

                i = this.listViewFilesDelet.length + 5;
            }
        }
    }
    
    



    removeFiles(){
        this.showSpinner();
        removeFiles({  
            recordId: this.recordId,
            listaDelet: this.listIdFilesDelet
        })
        .then(()=>{
            this.closeSpinner();
            this.listarArquivos();
            this.showToast('Sucesso !', 'Arquivos excluidos com sucesso', 'success');
            this.refreshComponents();
        })
        .catch(error=>{
            console.log('removeFiles ERROR: ' + error.body.message);
            this.showToast('ERRO', 'Ocorreu um erro ao enviar os arquivos.\n Por favor, tente mais tarde !', 'error');
        });
    }



    showSpinner(){
        this.spinner = true;
    }
    closeSpinner(){
        this.spinner = false;
    }

    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant,
            mode: 'dismissable'
        });
        this.dispatchEvent(event);
    }

    refreshComponents(){
        eval("$A.get('e.force:refreshView').fire();");
    }
}