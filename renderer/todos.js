/* Pure task editing helpers, shared by main calendar and mini widget. */
(function(root,factory){
  const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.KuunsTodos=api;
})(typeof window!=='undefined'?window:undefined,function(){
  function update(todos,id,value){
    const text=String(value??'').trim().slice(0,140);
    if(!text)return {todos,changed:false};
    let changed=false;
    const next=todos.map(task=>{
      if(task.id!==id||task.text===text)return task;
      changed=true;return {...task,text};
    });
    return {todos:changed?next:todos,changed};
  }
  return {update};
});
