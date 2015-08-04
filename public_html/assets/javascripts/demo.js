(function() {
  var setDefault;

  $(document).ready(function() {
    var cls, css_path, lls, sw;
    css_path = "assets/stylesheets/";
    sw = $("#style-switcher");
    sw.find(".fa-icon-cogs").click(function() {
      return sw.toggleClass("open");
    });
    sw.find(".style-switcher-color").click(function() {
      var btn, switch_to, target;
      btn = $(this);
      target = $(btn.data("switch-target"));
      switch_to = $(this).data("switch-to");
      target.attr("href", "" + css_path + switch_to);
      localStorage.setItem("colors", switch_to);
      setDefault(btn);
      return false;
    });
    sw.find(".style-switcher-button").click(function() {
      var action, btn, target;
      btn = $(this);
      if (!btn.parent().hasClass("style-switcher-reset")) {
        setDefault(btn);
      }
      action = btn.data("switch-to").split(":");
      target = $(btn.data("switch-target"));
      switch (action[0]) {
        case "addClass":
          target.addClass(action[1]);
          localStorage.setItem("layout", action[1]);
          break;
        case "removeClass":
          target.removeClass(action[1]);
          localStorage.removeItem("layout", action[1]);
          break;
        case "reset":
          target.find("[data-switch-default]").click();
          localStorage.removeItem("colors");
          localStorage.removeItem("layout");
      }
      return false;
    });
    cls = localStorage.getItem("colors");
    if (cls !== null && sw.find(".style-switcher-color[data-switch-to='" + cls + "']").length > 0) {
      $("#colors").attr("href", "" + css_path + cls);
      setDefault(sw.find("[data-switch-to='" + cls + "']"));
    }
    lls = localStorage.getItem("layout");
    if (lls !== null && sw.find(".style-switcher-button[data-switch-to='addClass:" + lls + "']").length > 0) {
      $("body").addClass(lls);
      return setDefault(sw.find("[data-switch-to='addClass:" + lls + "']"));
    }
  });

  setDefault = function(s) {
    s.parent().find("a").removeClass("active");
    s.addClass("active");
    return s;
  };

}).call(this);
(function() {
  $(document).ready(function() {
    $("#header .navbar-brand").hover(function() {
      return $(this).toggleClass("tada animated");
    });
    $("#collapse-on-tablet").click(function() {
      $("#nav").addClass("navbar-collapsed-md").removeClass("navbar-collapsed-sm");
      return $("#bootstrap").attr("href", $("#bootstrap").attr("href").replace("bootstrap.min.css", "bootstrap_01.min.css"));
    });
    return $("#collapse-on-phone").click(function() {
      $("#nav").addClass("navbar-collapsed-sm").removeClass("navbar-collapsed-md");
      return $("#bootstrap").attr("href", $("#bootstrap").attr("href").replace("bootstrap_01.min.css", "bootstrap.min.css"));
    });
  });

}).call(this);
