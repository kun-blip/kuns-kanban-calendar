'use strict';
(function(root){
  const MAX_SOURCE_BYTES=8*1024*1024;
  const MAX_SEND_BYTES=1200000;
  const VALID_TYPES=new Set(['image/png','image/jpeg','image/webp']);
  function validFile(file){return Boolean(file&&VALID_TYPES.has(file.type)&&file.size>0&&file.size<=MAX_SOURCE_BYTES);}
  function compress(file){
    if(!validFile(file))return Promise.reject(new Error('PNG, JPG, WebP 이미지(원본 8MB 이하)만 첨부할 수 있어요.'));
    return new Promise((resolve,reject)=>{
      const source=URL.createObjectURL(file);
      const image=new Image();
      image.onload=()=>{
        URL.revokeObjectURL(source);
        try{
          if(!image.naturalWidth||!image.naturalHeight)throw new Error('이미지 크기를 확인할 수 없어요.');
          const canvas=document.createElement('canvas');
          const scale=Math.min(1,1600/image.naturalWidth,1600/image.naturalHeight);
          canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
          canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
          const ctx=canvas.getContext('2d');
          if(!ctx)throw new Error('이미지 처리를 시작할 수 없어요.');
          ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
          ctx.drawImage(image,0,0,canvas.width,canvas.height);
          let encoded='';
          for(const quality of [0.88,0.76,0.62,0.48]){
            encoded=canvas.toDataURL('image/jpeg',quality).split(',')[1]||'';
            if(encoded.length*3/4<=MAX_SEND_BYTES)break;
          }
          if(encoded.length*3/4>MAX_SEND_BYTES)throw new Error('이미지가 너무 커요. 더 작은 영역을 캡처해 주세요.');
          resolve({filename:'feedback-screenshot.jpg',mimeType:'image/jpeg',dataBase64:encoded});
        }catch(err){reject(err);}
      };
      image.onerror=()=>{URL.revokeObjectURL(source);reject(new Error('이미지를 읽지 못했어요.'));};
      image.src=source;
    });
  }
  root.KuunsFeedbackImage={validFile,compress,MAX_SEND_BYTES};
})(typeof window!=='undefined'?window:globalThis);
