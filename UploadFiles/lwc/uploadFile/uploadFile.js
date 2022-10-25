import { LightningElement, api, track } from 'lwc';
import uploadFiles from '@salesforce/apex/FileUploaderClass.uploadFile';
import removeFiles from '@salesforce/apex/FileUploaderClass.removeFiles';
import listFiles from '@salesforce/apex/FileUploaderClass.listFiles';


class arquivos{
    Id;
    Name;
}

export default class UploadFile extends LightningElement {
    @api recordId;

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
                this.refreshComponents();
            })
            .catch(error=>{
                console.log('uploadFiles ERROR: ' + error.body.message);
            });
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
