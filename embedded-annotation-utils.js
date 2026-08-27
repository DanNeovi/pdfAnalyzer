(function attachEmbeddedAnnotationUtils(root,factory){
    const api=factory();
    if(typeof module==='object'&&module.exports)module.exports=api;
    root.EmbeddedAnnotationUtils=api;
}(typeof globalThis!=='undefined'?globalThis:this,function createEmbeddedAnnotationUtils(){
    'use strict';

    const SOURCE_PDF_NAME='__draftannotator_source_v1.pdf';
    const ANNOTATIONS_NAME='__draftannotator_annotations_v1.json';
    const NATIVE_ANNOTATIONS_NAME='__draftannotator_native_annotations_v1.json';
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

    function annotationTypeForNativeKind(kind){
        switch(String(kind||'')){
            case 'arrow':return 'arrow';
            case 'doubleArrow':return 'doubleArrow';
            case 'line':return 'line';
            case 'cloud':return 'cloud';
            case 'highlightPen':return 'highlightPen';
            case 'highlightBox':return 'highlightBox';
            case 'highlightEllipse':return 'highlightEllipse';
            case 'stamp':return 'insertedImage';
            default:return '';
        }
    }

    function serializedObjectMatchesNativeKind(object,kind){
        const type=String(object&&object.type||'').toLowerCase().replace(/-/g,'');
        switch(String(kind||'')){
            case 'arrow':case 'doubleArrow':return type==='group';
            case 'freeText':return type==='itext'||type==='text'||type==='textbox';
            case 'line':return type==='line';
            case 'square':case 'highlightBox':return type==='rect';
            case 'circle':case 'highlightEllipse':return type==='ellipse';
            case 'cloud':case 'ink':case 'highlightPen':return type==='path';
            case 'stamp':return type==='image';
            default:return true;
        }
    }

    function copyObjectMetadata(serializedObjects,sourceObjects,properties){
        if(!Array.isArray(serializedObjects)||!Array.isArray(sourceObjects)||!Array.isArray(properties))return 0;
        let copied=0;
        serializedObjects.forEach((serialized,index)=>{
            const source=sourceObjects[index];
            if(!serialized||!source)return;
            properties.forEach(property=>{
                if(source[property]===undefined)return;
                serialized[property]=source[property];
                copied++;
            });
        });
        return copied;
    }

    // Fabric 7.4 ignores Canvas#toJSON(propertiesToInclude), which caused the
    // first native-annotation release to omit IDs and annotationType from the
    // lossless payload. Native descriptors were written in the same page and
    // stacking order, so those PDFs can be repaired deterministically.
    function repairMissingObjectMetadata(payload){
        const descriptors=payload&&payload.nativeAnnotations&&payload.nativeAnnotations.descriptors;
        const pages=payload&&payload.pages;
        if(!Array.isArray(descriptors)||!Array.isArray(pages))return 0;
        const byPage=new Map();
        descriptors.forEach(descriptor=>{
            const pageIndex=Number(descriptor&&descriptor.pageIndex);
            if(!Number.isInteger(pageIndex)||pageIndex<0)return;
            if(!byPage.has(pageIndex))byPage.set(pageIndex,[]);
            byPage.get(pageIndex).push(descriptor);
        });
        let repaired=0;
        pages.forEach(page=>{
            const pageIndex=Number(page&&page.pageNumber)-1;
            const objects=page&&page.fabric&&page.fabric.objects;
            const pageDescriptors=byPage.get(pageIndex)||[];
            if(!Array.isArray(objects))return;
            const usedIds=new Set(objects.map(object=>object&&object.draftAnnotationId).filter(Boolean));
            objects.forEach((object,index)=>{
                if(!object||typeof object!=='object')return;
                let descriptor=object.draftAnnotationId
                    ?pageDescriptors.find(item=>item.id===object.draftAnnotationId)
                    :pageDescriptors.find(item=>!usedIds.has(item.id)&&serializedObjectMatchesNativeKind(object,item.kind));
                if(!descriptor){
                    const positional=pageDescriptors[index];
                    if(positional&&!usedIds.has(positional.id))descriptor=positional;
                }
                if(!descriptor||typeof descriptor.id!=='string'||!descriptor.id)return;
                if(!object.draftAnnotationId){
                    object.draftAnnotationId=descriptor.id;
                    usedIds.add(descriptor.id);
                    repaired++;
                }
                if(!object.annotationType){
                    const annotationType=annotationTypeForNativeKind(descriptor.kind);
                    if(annotationType)object.annotationType=annotationType;
                }
            });
        });
        return repaired;
    }

    function readStateFromAttachments(attachments){
        const nativeAttachment=findAttachment(attachments,NATIVE_ANNOTATIONS_NAME);
        if(nativeAttachment){
            const nativeBytes=toBytes(nativeAttachment.content);
            if(nativeBytes.length>MAX_ANNOTATION_BYTES)throw new Error('The embedded annotations are too large.');
            let payload;
            try{payload=JSON.parse(new TextDecoder().decode(nativeBytes));}
            catch(error){throw new Error('The embedded DraftAnnotator annotations are invalid JSON.');}
            return {mode:'native',sourcePdfBytes:null,payload};
        }
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
        return {mode:'legacy',sourcePdfBytes,payload};
    }

    async function embedNativeStateIntoPdf(pdfDocument,payload){
        if(!pdfDocument||typeof pdfDocument.attach!=='function')throw new Error('PDF attachment support is unavailable.');
        const annotationBytes=new TextEncoder().encode(JSON.stringify(payload));
        if(annotationBytes.length>MAX_ANNOTATION_BYTES){
            throw new Error('The editable annotations are too large to embed (100 MB maximum).');
        }
        await pdfDocument.attach(annotationBytes,NATIVE_ANNOTATIONS_NAME,{
            mimeType:'application/json',
            description:'Lossless DraftAnnotator object data for native PDF annotations'
        });
        return annotationBytes.length;
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
        NATIVE_ANNOTATIONS_NAME,
        SOURCE_PDF_NAME,
        copyObjectMetadata,
        embedNativeStateIntoPdf,
        embedStateIntoPdf,
        findAttachment,
        hasPdfHeader,
        readStateFromAttachments,
        repairMissingObjectMetadata
    };
}));
