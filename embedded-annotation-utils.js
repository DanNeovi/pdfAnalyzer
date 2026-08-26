(function attachEmbeddedAnnotationUtils(root,factory){
    const api=factory();
    if(typeof module==='object'&&module.exports)module.exports=api;
    root.EmbeddedAnnotationUtils=api;
}(typeof globalThis!=='undefined'?globalThis:this,function createEmbeddedAnnotationUtils(){
    'use strict';

    const SOURCE_PDF_NAME='__draftannotator_source_v1.pdf';
    const ANNOTATIONS_NAME='__draftannotator_annotations_v1.json';
    const MAX_ANNOTATION_BYTES=100*1024*1024;
    const MAX_SOURCE_BYTES=512*1024*1024;

    function findAttachment(attachments,fileName){
        if(!attachments||typeof attachments!=='object')return null;
        return Object.values(attachments).find(item=>item&&item.filename===fileName)||null;
    }

    function toBytes(value){
        if(value instanceof Uint8Array)return value.slice();
        if(value instanceof ArrayBuffer)return new Uint8Array(value.slice(0));
        if(ArrayBuffer.isView(value))return new Uint8Array(value.buffer,value.byteOffset,value.byteLength).slice();
        return new Uint8Array();
    }

    function hasPdfHeader(bytes){
        if(!(bytes instanceof Uint8Array)||bytes.length<5)return false;
        const head=String.fromCharCode(...bytes.subarray(0,Math.min(1024,bytes.length)));
        return head.includes('%PDF-');
    }

    function readStateFromAttachments(attachments){
        const sourceAttachment=findAttachment(attachments,SOURCE_PDF_NAME);
        const annotationAttachment=findAttachment(attachments,ANNOTATIONS_NAME);
        if(!sourceAttachment&&!annotationAttachment)return null;
        if(!sourceAttachment||!annotationAttachment){
            throw new Error('The embedded DraftAnnotator data is incomplete.');
        }

        const sourcePdfBytes=toBytes(sourceAttachment.content);
        const annotationBytes=toBytes(annotationAttachment.content);
        if(sourcePdfBytes.length>MAX_SOURCE_BYTES)throw new Error('The embedded source PDF is too large.');
        if(annotationBytes.length>MAX_ANNOTATION_BYTES)throw new Error('The embedded annotations are too large.');
        if(!hasPdfHeader(sourcePdfBytes))throw new Error('The embedded DraftAnnotator source is not a PDF.');

        let payload;
        try{payload=JSON.parse(new TextDecoder().decode(annotationBytes));}
        catch(error){throw new Error('The embedded DraftAnnotator annotations are invalid JSON.');}
        return {sourcePdfBytes,payload};
    }

    async function embedStateIntoPdf(pdfDocument,sourcePdfBytes,payload){
        if(!pdfDocument||typeof pdfDocument.attach!=='function')throw new Error('PDF attachment support is unavailable.');
        const sourceBytes=toBytes(sourcePdfBytes);
        if(!hasPdfHeader(sourceBytes))throw new Error('The DraftAnnotator source is not a PDF.');
        if(sourceBytes.length>MAX_SOURCE_BYTES){
            throw new Error('The source PDF is too large to preserve editable annotations (512 MB maximum).');
        }
        const annotationBytes=new TextEncoder().encode(JSON.stringify(payload));
        if(annotationBytes.length>MAX_ANNOTATION_BYTES){
            throw new Error('The editable annotations are too large to embed (100 MB maximum).');
        }
        await pdfDocument.attach(sourceBytes,SOURCE_PDF_NAME,{
            mimeType:'application/pdf',
            description:'Clean source PDF used to restore editable DraftAnnotator markup'
        });
        await pdfDocument.attach(annotationBytes,ANNOTATIONS_NAME,{
            mimeType:'application/json',
            description:'Editable DraftAnnotator annotation objects'
        });
        return annotationBytes.length;
    }

    return {
        ANNOTATIONS_NAME,
        MAX_ANNOTATION_BYTES,
        MAX_SOURCE_BYTES,
        SOURCE_PDF_NAME,
        embedStateIntoPdf,
        findAttachment,
        hasPdfHeader,
        readStateFromAttachments
    };
}));
