/*
* --------------------------------------------------------------------------------------------------------------------
* Name: Jednotka - Multipurpose Website HTML Template
* Author: http://themeforest.net/user/BublinaStudio
* Version: 1.6
* --------------------------------------------------------------------------------------------------------------------
*/


(function() {
  $(document).ready(function() {
    var $carousel, $header, $main, $sidebar, contentTop, padding, paddingTop, scrollHeight, touch;
    setValidateForm();
    setIEHelperClassses();
    /*
    * --------------------------------------------------------------------------------------------------------------------
    * Fixed header
    * --------------------------------------------------------------------------------------------------------------------
    */

    $header = $("#header");
    $carousel = $(".hero-carousel");
    $main = $("#main");
    if ($header.attr("fixed")) {
      $header.addClass("header--default");
      $(window).scroll(function() {
        if ($(window).scrollTop() >= $carousel.height() - 150) {
          $header.addClass("header--fixed");
          $main.addClass("main--header-fixed");
        } else {
          $header.removeClass("header--fixed");
          $main.removeClass("main--header-fixed");
        }
        if ($(window).scrollTop() > $carousel.height()) {
          return $header.addClass("header--visible");
        } else {
          return $header.removeClass("header--visible");
        }
      });
    }
    /*
    * --------------------------------------------------------------------------------------------------------------------
    * bootstrap carousel definition
    * --------------------------------------------------------------------------------------------------------------------
    */

    if (jQuery().carousel) {
      $('.carousel.carousel-auto').carousel();
      $('.carousel.carousel-auto').on("swipeleft", function(e) {
        return $(this).carousel('next');
      });
      $('.carousel.carousel-auto').on("swiperight", function(e) {
        return $(this).carousel('prev');
      });
    }
    /*
    * --------------------------------------------------------------------------------------------------------------------
    * circle statistics
    * --------------------------------------------------------------------------------------------------------------------
    */

    if (jQuery().knob) {
      $("[data-stat='circle']").each(function(i, el) {
        return $(el).knob();
      });
    }
    /*
    * --------------------------------------------------------------------------------------------------------------------
    * setting up bootstrap tooltips
    * --------------------------------------------------------------------------------------------------------------------
    */

    touch = false;
    if (window.Modernizr) {
      touch = Modernizr.touch;
    }
    if (!touch) {
      $("body").on("mouseenter", ".has-tooltip", function() {
        var el;
        el = $(this);
        if (el.data("tooltip") === undefined) {
          el.tooltip({
            placement: el.data("placement") || "top",
            container: "body"
          });
        }
        return el.tooltip("show");
      });
      $("body").on("mouseleave", ".has-tooltip", function() {
        return $(this).tooltip("hide");
      });
    }
    /*
    * --------------------------------------------------------------------------------------------------------------------
    * replacing *.svg images for *.png for browsers without *.svg support
    * --------------------------------------------------------------------------------------------------------------------
    */

    if (window.Modernizr && Modernizr.svg === false) {
      $("img[src*=\"svg\"]").attr("src", function() {
        return $(this).attr("src").replace(".svg", ".png");
      });
    }
    /*
    * --------------------------------------------------------------------------------------------------------------------
    * setting placeholders for browsers without placeholder support
    * --------------------------------------------------------------------------------------------------------------------
    */

    if (window.Modernizr && Modernizr.input.placeholder === false) {
      $("[placeholder]").focus(function() {
        var input;
        input = $(this);
        if (input.val() === input.attr("placeholder")) {
          input.val("");
          return input.removeClass("placeholder");
        }
      }).blur(function() {
        var input;
        input = $(this);
        if (input.val() === "" || input.val() === input.attr("placeholder")) {
          input.addClass("placeholder");
          return input.val(input.attr("placeholder"));
        }
      }).blur();
      $("[placeholder]").parents("form").submit(function() {
        return $(this).find("[placeholder]").each(function() {
          var input;
          input = $(this);
          if (input.val() === input.attr("placeholder")) {
            return input.val("");
          }
        });
      });
    }
    /*
    * --------------------------------------------------------------------------------------------------------------------
    * flexslider
    * --------------------------------------------------------------------------------------------------------------------
    */

    $(window).load(function() {
      var $allSlides, $flexslider;
      if (jQuery().flexslider) {
        $flexslider = $('.flexslider');
        $allSlides = $flexslider.find('.item');
        $flexslider.addClass("fade-loading");
        return $('.flexslider').flexslider({
          animation: 'fade',
          pauseOnHover: true,
          slideshowSpeed: 5000,
          animationSpeed: 400,
          prevText: '',
          nextText: '',
          before: function(slider) {
            var $activeSlide;
            $activeSlide = $flexslider.find('.flex-active-slide');
            if ($activeSlide.index() === $allSlides.length - 1) {
              $allSlides.eq(0).find('.animate').children().addClass("animate").removeClass("animated");
              $allSlides.not('.flex-active-slide').find('.animate').children().addClass("animate").removeClass("animated");
            } else {
              $allSlides.not('.flex-active-slide').find('.animate').children().addClass("animate").removeClass("animated");
            }
            return setTimeout((function() {
              return $allSlides.eq(slider.animatingTo).find('.animate').children().addClass("animated").removeClass("animate");
            }), 50);
          }
        });
      }
    });
    /*
    * --------------------------------------------------------------------------------------------------------------------
    * setting up countdown plugin
    * --------------------------------------------------------------------------------------------------------------------
    */

    if (jQuery().countdown) {
      $("[data-countdown]").countdown();
    }
    /*
    * --------------------------------------------------------------------------------------------------------------------
    * Fixed panel
    * --------------------------------------------------------------------------------------------------------------------
    */

    $sidebar = $(".sidebar", "#main-content");
    contentTop = $("#main-content").offset().top;
    paddingTop = $("#main-content").css("paddingTop");
    padding = parseInt(paddingTop.substr(0, paddingTop.length - 2));
    scrollHeight = $("#main-content").outerHeight() - $sidebar.outerHeight() + padding;
    if ($sidebar.hasClass("sidebar-fixed")) {
      $sidebar.parent().css({
        position: "relative"
      });
      $sidebar.css({
        position: "absolute"
      });
      $(window).scroll(function() {
        var top;
        if ($(this).scrollTop() >= contentTop && $(this).scrollTop() <= scrollHeight) {
          top = $(window).scrollTop() - contentTop;
          $sidebar.css({
            top: top
          });
        }
        if ($(this).scrollTop() < contentTop) {
          $sidebar.css({
            top: 0
          });
        }
        if ($(this).scrollTop() > scrollHeight) {
          return $sidebar.css({
            top: scrollHeight - contentTop
          });
        }
      });
    }
    /*
    * --------------------------------------------------------------------------------------------------------------------
    * scroll top button
    * --------------------------------------------------------------------------------------------------------------------
    */

    $("#scroll-to-top").on("click", function(e) {
      $("body, html").animate({
        scrollTop: 0
      }, 800);
      return false;
    });
    $(window).load(function() {
      var $scrollToTop, defaultBottom, scrollArea;
      $scrollToTop = $("#scroll-to-top");
      defaultBottom = $scrollToTop.css("bottom");
      scrollArea = function() {
        return $(document).outerHeight() - $("#footer").outerHeight() - $(window).outerHeight();
      };
      if ($('body').hasClass("boxed")) {
        return $(window).scroll(function() {
          if ($(this).scrollTop() > 500) {
            return $scrollToTop.addClass("in");
          } else {
            return $scrollToTop.removeClass("in");
          }
        });
      } else {
        return $(window).scroll(function() {
          if ($(this).scrollTop() > 500) {
            $scrollToTop.addClass("in");
          } else {
            $scrollToTop.removeClass("in");
          }
          if ($(this).scrollTop() >= scrollArea()) {
            return $scrollToTop.css({
              bottom: $(this).scrollTop() - scrollArea() + 10
            });
          } else {
            return $scrollToTop.css({
              bottom: defaultBottom
            });
          }
        });
      }
    });
    /*
    * --------------------------------------------------------------------------------------------------------------------
    * setting up nivo lightbox
    * --------------------------------------------------------------------------------------------------------------------
    */

    if (jQuery().nivoLightbox) {
      $("[data-lightbox]").nivoLightbox();
    }
    /*
     * --------------------------------------------------------------------------------------------------------------------
     * ajax contact form
     * --------------------------------------------------------------------------------------------------------------------
    */

    return $(".form-contact").on("submit", function(e) {
      var error, inputs, submit, success;
      if ($(this).valid()) {
        e.preventDefault();
        submit = $(this).find(".form-contact-submit");
        submit.button("loading");
        success = $(this).find(".form-contact-success");
        error = $(this).find(".form-contact-error");
        inputs = $(this).find("input, textarea");
        return $.ajax({
          type: "POST",
          url: "contact.php",
          data: $(this).serialize(),
          success: function(data) {
            if (data === "success") {
              success.removeClass("hidden");
              error.addClass("hidden");
              return inputs.val("");
            } else {
              error.removeClass("hidden");
              return success.addClass("hidden");
            }
          },
          complete: function() {
            return submit.button("reset");
          }
        });
      }
    });
  });

  /*
  * --------------------------------------------------------------------------------------------------------------------
  * form validation
  * --------------------------------------------------------------------------------------------------------------------
  */


  this.setValidateForm = function(selector) {
    if (selector == null) {
      selector = $(".form-validation");
    }
    if (jQuery().validate) {
      return selector.each(function(i, elem) {
        return $(elem).validate({
          errorElement: "span",
          errorClass: "help-block has-error",
          errorPlacement: function(err, e) {
            return e.closest('.control-group').append(err);
          },
          highlight: function(e) {
            return $(e).closest('.control-group').addClass('has-error');
          },
          unhighlight: function(e) {
            return $(e).closest('.control-group').removeClass('has-error');
          }
        });
      });
    }
  };

  /*
  * --------------------------------------------------------------------------------------------------------------------
  * internet explorer helpers classes :last-child, :nth-child
  * --------------------------------------------------------------------------------------------------------------------
  */


  this.setIEHelperClassses = function() {
    if (/msie/.test(navigator.userAgent.toLowerCase())) {
      $('*:last-child').addClass("last-child");
      $('*:nth-child(odd)').addClass("nth-child-odd");
      return $('*:nth-child(even)').addClass("nth-child-even");
    }
  };

}).call(this);
(function() {
  $(window).load(function() {
    /*
    * --------------------------------------------------------------------------------------------------------------------
    * isotope portfolio filtration
    * --------------------------------------------------------------------------------------------------------------------
    */

    var $portfolio;
    if (jQuery().isotope) {
      $portfolio = $("#portfolio-container");
      $portfolio.isotope({
        layoutMode: 'sloppyMasonry',
        itemSelector: ".portfolio-item"
      });
      return $("#portfolio-filter a").click(function() {
        var selector;
        $(this).closest("ul").find("li").removeClass("active");
        $(this).parent().addClass("active");
        selector = $(this).attr("data-filter");
        $portfolio.isotope({
          filter: selector
        });
        return false;
      });
    }
  });

}).call(this);


