import { LightningElement, api, track } from 'lwc';
import uploadFiles from '@salesforce/apex/FileUploaderClass.uploadFile';
import removeFiles from '@salesforce/apex/FileUploaderClass.removeFiles';
import listFiles from '@salesforce/apex/FileUploaderClass.listFiles';

export default class UploadFile extends LightningElement {
    @api recordId;
    @track listFiles;

    @track listViewFiles = [];
    @track listViewFilesDelet = [];
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
        this.textFiles = await Promise.all(
            [...event.target.files].map(file => this.readFile(file))
        );
        console.log(this.textFiles);       
    }


    uploadMultipleFiles(){
        this.showSpinner();

        this.textFiles.forEach(item => {
            const {base64, fileName} = item;
            uploadFiles({ 
                base64: base64, 
                filename: fileName, 
                recordId: this.recordId
            })
            .then(()=>{
                this.fileData = null;
                this.closeSpinner();
            })
            .catch(error=>{
                console.log('uploadFiles ERROR: ' + error.body.message);
            });
        });
        
        if (this.viewFiles){
            this.listarArquivos();
        }
        setTimeout(() => {
            this.refreshComponents();
        }, 2000);
        
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
                this.listFiles = result;

                result.forEach(item => {
                    this.listViewFiles[this.listViewFiles.length] = item.Title;
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
        
        this.listViewFilesDelet[this.listViewFilesDelet.length] = titulo;
        
        for (let i = 0; i < this.listFiles.length; i++) {
            if (this.listFiles[i].Title == titulo) {
                this.listIdFilesDelet[this.listIdFilesDelet.length] = this.listFiles[i].Id;
                i = this.listFiles.length + 5;
            }
        }
        
        for (let i = 0; i < this.listViewFiles.length; i++) {
            if (this.listViewFiles[i] == titulo) {
                this.listViewFiles.splice(i, 1);
                i = this.listViewFiles.length + 5;
            }
        }
    }    
    
    removeArquivoSelecionado(event){
        var titulo = event.target.title;
        
        this.listViewFiles[this.listViewFiles.length] = titulo;
        
        for (let i = 0; i < this.listViewFilesDelet.length; i++) {
            if (this.listViewFilesDelet[i] == titulo) {
                this.listViewFilesDelet.splice(i, 1);
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
            this.refreshComponents();
        })
        .catch(error=>{
            console.log('removeFiles ERROR: ' + error.body.message);
        });
    }



    showSpinner(){
        this.spinner = true;
    }
    closeSpinner(){
        this.spinner = false;
    }

    refreshComponents(){
        eval("$A.get('e.force:refreshView').fire();");
    }
}