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

    return {getContainTransform,isWinAnsiCompatibleText,normalizeRotation,rotatePixelRect};
}));
