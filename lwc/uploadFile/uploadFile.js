import { LightningElement, api } from 'lwc';
import uploadFiles from '@salesforce/apex/FileUploaderClass.uploadFile';
import removeFiles from '@salesforce/apex/FileUploaderClass.removeFiles';

export default class UploadFile extends LightningElement {
    @api recordId;

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
        this.textFiles.forEach(item => {
            const {base64, fileName} = item
            // console.log(base64);
            // console.log(fileName);
            
            uploadFiles({ 
                base64: base64, 
                filename: fileName, 
                recordId: this.recordId
            })
            .then(result=>{
                console.log('FUNCIONOU');
                this.fileData = null
                // let title = `${filename} uploaded successfully!!`
                // this.toast(title)
            })
            .catch(error=>{
                console.log('ERROR: ' + error.body.message);

            });
        });
    }


    removeFiles(){
        uploadFiles({  
            recordId: this.recordId
        })
        .then(result=>{
            console.log('FUNCIONOU');
        })
        .catch(error=>{
            console.log('ERROR: ' + error.body.message);
        });
    }
}