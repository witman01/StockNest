export const LOOK_KEY = "stocknest.look";

/** Runs before paint (in <head>): ?look= in the URL wins, then the saved choice. */
export const LOOK_BOOT = `try{var q=new URLSearchParams(location.search).get("look"),s=localStorage.getItem("${LOOK_KEY}"),l=["original","paper","charcoal"].indexOf(q)>-1?q:s;if(["paper","charcoal"].indexOf(l)>-1){document.documentElement.dataset.look=l;localStorage.setItem("${LOOK_KEY}",l)}else{document.documentElement.dataset.look="original"}}catch(e){}`;
