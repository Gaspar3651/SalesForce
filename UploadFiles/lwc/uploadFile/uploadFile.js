import { LightningElement, api, track } from 'lwc';
import uploadFiles from '@salesforce/apex/FileUploaderClass.uploadFile';
import removeFiles from '@salesforce/apex/FileUploaderClass.removeFiles';
import listFiles from '@salesforce/apex/FileUploaderClass.listFiles';

export default class UploadFile extends LightningElement {
    @api recordId;
    @track listFiles;
    listFilesDelet = [];

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


    uploadFiles(){
        this.showSpinner();
        this.textFiles.forEach(item => {
            const {base64, fileName} = item
            // console.log(base64);
            // console.log(fileName);
            
            uploadFiles({ 
                base64: base64, 
                filename: fileName, 
                recordId: this.recordId
            })
            .then(()=>{
                console.log('OPAAAAA');
                this.fileData = null
                if (viewFiles) {
                    this.listarArquivos();
                }
            })
            .catch(error=>{
                console.log('uploadFiles ERROR: ' + error.body.message);

            });
        });
        this.closeSpinner();
    }

    listarArquivos(){
        this.viewFiles = !this.viewFiles;
        console.log(this.viewFiles);

        if (this.viewFiles) {  
            this.showSpinner(); 
            listFiles({
                recordId: this.recordId
            }).then(result=>{
                this.listFiles = result;
                
                this.closeSpinner();
            }).catch(error=>{
                console.log('listFiles ERROR: ' + error.body.message);
            });
        }
    }

    selecionaArquivo(event){
        var idSelecionado = event.target.value;
        
        this.listFilesDelet[this.listFilesDelet.length] = idSelecionado;
    }

    removeFiles(){
        this.showSpinner();
        removeFiles({  
            recordId: this.recordId,
            listaDelet: this.listFilesDelet
        })
        .then(()=>{
            this.closeSpinner();
            console.log('FUNCIONOU');
            if (viewFiles) {
                this.listarArquivos();
            }
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