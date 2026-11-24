globalThis.localStorage={s:{},getItem(k){return this.s[k]??null},setItem(k,v){this.s[k]=v}}
const L=await import('../ledger.js')
const cases=['Sold 3 bags of rice at 45k each to Mama Bisi','sold two cartons of indomie to Tunde for 18,500 each','spent 2000 on transport','sold 2 garri 1500 each','bought 10 crates of eggs 38000','no number here']
for(const c of cases) console.log(c,'=>',JSON.stringify(L.ruleParse(c)&&(({type,item,qty,total})=>({type,item,qty,total}))(L.ruleParse(c))))
console.log(L.normalise(L.extractJson('Here: {"type":"sale","item":"rice","qty":3,"unitPrice":45000,"total":null}'),'x').total)
const e=[L.ruleParse('sold 3 rice 45k each'),L.ruleParse('spent 2000 on transport')]
console.log(L.summary(e))
