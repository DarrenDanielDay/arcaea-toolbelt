(function () {
  function showError(msg: string) {
    window.alert(msg);
  }
  try {
    new CSSStyleSheet();
  } catch {
    showError(
      `您的浏览器不支持创建CSSStyleSheet。\
如果您是iOS用户，您需要将系统升级到版本16.4以上，\
并且在Safari的高级设置中将"Experimental Features"中的\
"Constructable Stylesheets"选项开启才能正常使用此网站。`
    );
  }
})();
