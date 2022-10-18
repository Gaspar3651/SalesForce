import { LightningElement, api, track } from 'lwc';
import uploadFiles from '@salesforce/apex/FileUploaderClass.uploadFile';
import removeFiles from '@salesforce/apex/FileUploaderClass.removeFiles';
import listFiles from '@salesforce/apex/FileUploaderClass.listFiles';

export default class UploadFile extends LightningElement {
    @api recordId;
    @track listFiles;
    @track listFilesBakup;
    @track listViewDelet = [];
    
    listFilesDelet = [];
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
                console.log('SARVEE');
                this.fileData = null
                this.atualizaConponentes();
            })
            .catch(error=>{
                console.log('uploadFiles ERROR: ' + error.body.message);
            });
        });

        this.textFiles = [];
    }

    listarArquivos(){
        this.viewFiles = !this.viewFiles;
        console.log(this.viewFiles);
        this.listViewDelet = [];

        if (this.viewFiles) {  
            this.labelBtn = "Ocultar Arquivos";
            this.showSpinner(); 
            listFiles({
                recordId: this.recordId
            }).then(result=>{
                this.listFiles = result;
                this.listFilesBakup = result;
                
                this.closeSpinner();
            }).catch(error=>{
                console.log('listFiles ERROR: ' + error.body.message);
            });
        }else{
            this.labelBtn = "Listar Arquivos";
        }
    }


    selecionaArquivo(event){
        var idSelecionado = event.target.value;
        var titulo = event.target.title;
        
        this.listFilesDelet[this.listFilesDelet.length] = idSelecionado;
        this.listViewDelet[this.listViewDelet.length] = titulo;
        
        for (let i = 0; i < this.listFiles.length; i++) {
            if (this.listFiles[i].Id == idSelecionado) {
                this.listFiles.splice(i, 1);
            }
        }
    }    
    
    removeArquivoSelecionado(event){
        var titulo = event.target.title;
        
        for (let i = 0; i < this.listFilesBakup.length; i++) {
            console.log('----------------------------------> '+ this.listFilesBakup[i].Title);

            if (this.listFilesBakup[i].Title == titulo) {
                this.listFile[this.listFile.length] = this.listFilesBakup[i];
                
                
                this.listFilesDelet.forEach(item => {
                    if (item == this.listFilesBakup[i].Id) {
                        this.listFilesDelet.splice(i, 1);
                    }
                });

                i += this.listFilesBakup.length;
            }
        }
        
        for (let i = 0; i < this.listViewDelet.length; i++) {
            if (this.listViewDelet[i].Title == titulo) {
                this.listViewDelet.splice(i, 1);
                
                i += this.listViewDelet.length;
            }
        }
    }
    
    



    removeFiles(){
        this.showSpinner();
        removeFiles({  
            recordId: this.recordId,
            listaDelet: this.listFilesDelet
        })
        .then(()=>{
            this.closeSpinner();
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
}