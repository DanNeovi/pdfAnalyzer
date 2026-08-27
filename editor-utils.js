(function attachEditorUtils(root,factory){
    const api=factory();
    if(typeof module==='object'&&module.exports)module.exports=api;
    root.EditorUtils=api;
}(typeof globalThis!=='undefined'?globalThis:this,function createEditorUtils(){
    'use strict';

    const WIN_ANSI_EXTRA_CODE_POINTS=new Set([
        0x20ac,0x201a,0x0192,0x201e,0x2026,0x2020,0x2021,0x02c6,
        0x2030,0x0160,0x2039,0x0152,0x017d,0x2018,0x2019,0x201c,
        0x201d,0x2022,0x2013,0x2014,0x02dc,0x2122,0x0161,0x203a,
        0x0153,0x017e,0x0178
    ]);

    function isWinAnsiCompatibleText(value){
        for(const character of String(value||'')){
            const code=character.codePointAt(0);
            if(code===0x0a||code===0x0d)continue;
            if((code>=0x20&&code<=0x7e)||(code>=0xa0&&code<=0xff)||WIN_ANSI_EXTRA_CODE_POINTS.has(code))continue;
            return false;
        }
        return true;
    }

    function getContainTransform(sourceWidth,sourceHeight,targetWidth,targetHeight){
        const safeSourceWidth=Number(sourceWidth)>0?Number(sourceWidth):Number(targetWidth)||1;
        const safeSourceHeight=Number(sourceHeight)>0?Number(sourceHeight):Number(targetHeight)||1;
        const safeTargetWidth=Number(targetWidth)>0?Number(targetWidth):safeSourceWidth;
        const safeTargetHeight=Number(targetHeight)>0?Number(targetHeight):safeSourceHeight;
        const scale=Math.min(safeTargetWidth/safeSourceWidth,safeTargetHeight/safeSourceHeight);
        return {
            scale,
            offsetX:(safeTargetWidth-(safeSourceWidth*scale))/2,
            offsetY:(safeTargetHeight-(safeSourceHeight*scale))/2
        };
    }

    function clamp(value,min,max){
        return Math.min(max,Math.max(min,value));
    }

    function getContainedImagePlacement(imageWidth,imageHeight,canvasWidth,canvasHeight,desiredX,desiredY,maxFraction=0.8){
        const iw=Math.max(1,Number(imageWidth)||1);
        const ih=Math.max(1,Number(imageHeight)||1);
        const cw=Math.max(1,Number(canvasWidth)||1);
        const ch=Math.max(1,Number(canvasHeight)||1);
        const fraction=clamp(Number(maxFraction)||0.8,0.05,1);
        const scale=Math.min(1,(cw*fraction)/iw,(ch*fraction)/ih);
        const width=iw*scale;
        const height=ih*scale;
        const requestedX=Number.isFinite(Number(desiredX))?Number(desiredX):cw/2;
        const requestedY=Number.isFinite(Number(desiredY))?Number(desiredY):ch/2;
        return {
            scale,
            width,
            height,
            x:width>=cw?cw/2:clamp(requestedX,width/2,cw-(width/2)),
            y:height>=ch?ch/2:clamp(requestedY,height/2,ch-(height/2))
        };
    }

    function getBoundsTranslationInsideContainer(bounds,containerWidth,containerHeight,padding=0){
        const x=Number(bounds&&bounds.x)||0;
        const y=Number(bounds&&bounds.y)||0;
        const width=Math.max(0,Number(bounds&&bounds.width)||0);
        const height=Math.max(0,Number(bounds&&bounds.height)||0);
        const cw=Math.max(1,Number(containerWidth)||1);
        const ch=Math.max(1,Number(containerHeight)||1);
        const pad=clamp(Number(padding)||0,0,Math.min(cw,ch)/2);
        const availableWidth=Math.max(0,cw-(pad*2));
        const availableHeight=Math.max(0,ch-(pad*2));
        const targetX=width>availableWidth?(cw-width)/2:clamp(x,pad,cw-pad-width);
        const targetY=height>availableHeight?(ch-height)/2:clamp(y,pad,ch-pad-height);
        return {dx:targetX-x,dy:targetY-y};
    }

    function getClipboardObjectPlacement(object,sourceWidth,sourceHeight,targetWidth,targetHeight,delta=0){
        const transform=getContainTransform(sourceWidth,sourceHeight,targetWidth,targetHeight);
        const offset=Number(delta)||0;
        return {
            left:transform.offsetX+((Number(object&&object.left)||0)*transform.scale)+offset,
            top:transform.offsetY+((Number(object&&object.top)||0)*transform.scale)+offset,
            scaleX:(Number(object&&object.scaleX)||1)*transform.scale,
            scaleY:(Number(object&&object.scaleY)||1)*transform.scale
        };
    }

    function getPageTextReplacementPlacement(metrics){
        const layerWidth=Math.max(1,Number(metrics&&metrics.layerWidth)||1);
        const layerHeight=Math.max(1,Number(metrics&&metrics.layerHeight)||1);
        const sceneWidth=Math.max(1,Number(metrics&&metrics.sceneWidth)||layerWidth);
        const sceneHeight=Math.max(1,Number(metrics&&metrics.sceneHeight)||layerHeight);
        const scaleX=sceneWidth/layerWidth;
        const scaleY=sceneHeight/layerHeight;
        return {
            left:(Number(metrics&&metrics.offsetLeft)||0)*scaleX,
            top:(Number(metrics&&metrics.offsetTop)||0)*scaleY,
            width:Math.max(8,(Number(metrics&&metrics.offsetWidth)||8)*Math.max(0.01,Number(metrics&&metrics.transformScaleX)||1)*scaleX),
            fontSize:Math.max(4,(Number(metrics&&metrics.fontSize)||12)*scaleY),
            angle:Number(metrics&&metrics.angle)||0
        };
    }

    function getClipboardImageBlob(clipboardData){
        if(!clipboardData)return null;
        const items=Array.from(clipboardData.items||[]);
        for(const item of items){
            if(item.kind==='file'&&/^image\//i.test(item.type||'')){
                const file=typeof item.getAsFile==='function'?item.getAsFile():null;
                if(file)return file;
            }
        }
        return Array.from(clipboardData.files||[]).find(file=>/^image\//i.test(file.type||''))||null;
    }

    function normalizeRotation(angle){
        const rotation=((Math.round(Number(angle)||0)%360)+360)%360;
        return rotation===90||rotation===180||rotation===270?rotation:0;
    }

    function rotatePixelRect(rect,sourceWidth,sourceHeight,rotation){
        switch(normalizeRotation(rotation)){
            case 90:return {x:rect.y,y:sourceWidth-(rect.x+rect.width),width:rect.height,height:rect.width};
            case 180:return {x:sourceWidth-(rect.x+rect.width),y:sourceHeight-(rect.y+rect.height),width:rect.width,height:rect.height};
            case 270:return {x:sourceHeight-(rect.y+rect.height),y:rect.x,width:rect.height,height:rect.width};
            default:return {...rect};
        }
    }

    return {
        getBoundsTranslationInsideContainer,
        getClipboardImageBlob,
        getClipboardObjectPlacement,
        getContainedImagePlacement,
        getContainTransform,
        getPageTextReplacementPlacement,
        isWinAnsiCompatibleText,
        normalizeRotation,
        rotatePixelRect
    };
}));
