(function($, window) {
var visitor = window.visitor,
    slideshow = window.slideshow,
    data = window.data,
    IMAGESIZES = [
            {suffix: "_s", size: 75},
            {suffix: "_t", size: 100},
            {suffix: "_m", size: 240},
    ],
    imageSize = IMAGESIZES[0],
    PAGESIZE = 500,
    template = function(option) { return '<li style="width:' + option.size + 'px;height:' + option.size + 'px"><img data-photoid="<%= id %>" alt="<%= title %>" src="http://farm<%=farm%>.static.flickr.com/<%=server%>/<%=id%>_<%=secret%>' + option.suffix + '.jpg"></li>'; },
    EXTRAS = "owner_name,tags",
    reader = {
        data: function(result) {
            return result.photos.photo;
        },
        total: function(result) {
            return Math.min(result.photos.total, PAGESIZE);
        }
    },
    dataSource = data.dataSource({
        pageSize: 5,
        serverSorting: true,
        dialect: {
            read: function(data) {
                var params = {
                    text: $("#searchBox").val(),
                    extras: EXTRAS,
                    per_page: PAGESIZE
                };
                return flickr.searchParams(params);
            }
        },
        reader: reader
    }),
    mostPopularDataSource = data.dataSource({
        dialect: {
            read: function(data) {
                var params = {
                    extras: EXTRAS,
                    per_page: 100
                };
                return flickr.mostPopularParams(params);
            }
        },
        reader: reader
    });

   function displayImages(element) {
       element.find("img")
           .hide()
           .bind("load", function() {
               $(this).fadeIn();
           });
   }

   function showSelectedPhoto(ui) {
       $("#flatSearchPhotos").show();

       ui.element.parent().hide();
       $("#overlay").fadeOut();

       setBigPhoto(ui.selectable.value().find("img"));

       dataSource.query({page: 1, pageSize: PAGESIZE});

       $(".bottomLink").text("Back to search results").data("currentView", "flatMostPopularPhotos");
   }

   var loadingTimeout = 0;

   function setBigPhoto(img) {
       var bigPhoto = $("#bigPhoto"),
           src = img.attr("src").replace("_s", "").replace(imageSize.suffix,""),
           loader = $("img.loader"),
           exifInfo = $(".exifInfo");

        if (loader[0]) {
            loader.remove();
        } else {
            loadingTimeout = setTimeout(function() {
                bigPhoto.after("<div class='loading'>Loading ...</div>");
                exifInfo.fadeOut();
            }, 100);
        }

        loader = $("<img class='loader' />")
            .hide()
            .appendTo(document.body)
            .attr("src", src)
            .bind("load", function() {
                clearTimeout(loadingTimeout);

                loader.remove();

                bigPhoto.next(".loading")
                    .remove()
                    .end();

                if (!slideshow._started){
                   bigPhoto = bigPhoto.add(exifInfo);
                }

                bigPhoto.stop(true, true)
                    .fadeOut(function() {
                        if (this == exifInfo[0]) {
                            exifInfo.find("h2")
                               .text(img.attr("alt") || "No Title")
                               .end()
                               .attr("data-photoid", img.attr("data-photoid"));
                            exifInfo.css({
                               display: 'block',
                               opacity: 0
                            });
                        } else {
                            bigPhoto.attr("src", src);
                        }
                    });

                bigPhoto.fadeIn({
                    step: function (now) {
                        if (!slideshow._started)
                            exifInfo.css('opacity',  now);
                    }
                });
            });
   }

   window.visitor = {
       hideExif: function() {
           var exifWindow = $("#exifWindow");
           if (exifWindow[0]) {
               exifWindow.data("kendoWindow").close();
           }
        },
        mostPopular: function() {
            this.thumbList.append( $("#flatMostPopularPhotos").kendoListView({
                dataSource: mostPopularDataSource,
                template: template(IMAGESIZES[0]),
                dataBound: function() {
                    var li = this.element.find("li:first");
                    this.selectable.value(li);
                    displayImages(this.element);
                },
                change: function() {
                    setBigPhoto(this.selected().find("img"));
                }
            }));
        },
        search: function(el) {
            if($("#searchBox").val()) {
                this.searchResult();
                dataSource.query({page: 1, pageSize: 20});
                $("#flatMostPopularPhotos").hide();
                $("#flatSearchPhotos").hide();
                $("#overlay").fadeIn();
                $("#exifButton").fadeOut();
                slideshow.init($("#flatSearchPhotos").data("kendoListView"));
            }
        },

        searchResult: function () {
            var that = this;
            that._showSearchResults = true;
            $("#overlay").after("<div id='searchLoading' class='loading'>Loading ...</div>");

            if(that._searchInitialized){
                return;
            }

            that._searchInitialized = true;

            $(".paging").kendoPager({ dataSource: dataSource });

            $("#flatSearchPhotos").kendoListView({
                autoBind: false,
                dataSource: dataSource,
                template: template(IMAGESIZES[0]),
                dataBound: function() {
                    displayImages(this.element);
                },
                change: function() {
                    setBigPhoto(this.selected().find("img"));
                }
            });
            $("#mainPhotoGrid").kendoGrid({
                autoBind: false,
                dataSource: dataSource,
                pageable: $(".paging").data("kendoPager"),
                selectable: true,
                columns: [
                    { template: '<img src="http://farm<%=farm%>.static.flickr.com/<%=server%>/<%=id%>_<%=secret%>_s.jpg">', title: "PHOTO" },
                    { field: "ownername", title: "AUTHOR" },
                    { field: "title", title: "TITLE" },
                    { field: "tags", title: "TAGS"}
                ],
                change: function() {
                    showSelectedPhoto(this);
                },
                dataBound: function() {
                    displayImages(this.element);
                }
            }).hide();

            $("#mainPhotoStrip").kendoListView({
                autoBind: false,
                dataSource: dataSource,
                template: template(imageSize),
                dataBound: function() {
                    if(that._showSearchResults){
                        $("#mainTemplate").show();
                        that._showSearchResults = false;
                    }
                    $(".bottomLink").text("Back to most popular").data("currentView", "mainTemplate");
                    displayImages(this.element);
                    $("#searchLoading").remove();
                },
                change: function() {
                    showSelectedPhoto(this);
                }
            });

            that.initSlider();

            $(".i-gridview").click(function() {
                dataSource.query({page: 1, pageSize: 5});
                $(this).addClass("currentView");
                $(".i-tileview").removeClass("currentView");
                $("#mainPhotoStrip").hide();
                $("#slider").parent().hide();
                $("#mainPhotoGrid").show();
                $("#overlay").fadeIn();
                $("#exifButton").fadeOut();
            });

            $(".i-tileview").click(function() {
                var value = $("#slider").data("kendoSlider").value(),
                    pageSize = value === 0 ? 20 : parseInt(20 / value);

                dataSource.query({page: 1, pageSize: pageSize});

                $(this).addClass("currentView");
                $(".i-gridview").removeClass("currentView");
                $("#mainPhotoGrid").hide();
                $("#mainPhotoStrip").show();
                $("#slider").parent().show();
                $("#overlay").fadeIn();
                $("#exifButton").fadeOut();
            });

            $(".i-tileview").click(function() {
                var value = $("#slider").data("kendoSlider").value(),
                    pageSize = value === 0 ? 20 : parseInt(20 / value);

                dataSource.query({page: 1, pageSize: pageSize});

                $(this).addClass("currentView");
                $(".i-gridview").removeClass("currentView");
                $("#mainPhotoGrid").hide();
                $("#mainPhotoStrip").show();
                $("#slider").parent().show();
            }).addClass("currentView");

            $(".bottomLink").bind("click", function(){
                var element = $(this),
                    view = element.data("currentView");

                if(view === "flatMostPopularPhotos") {
                    element.data("currentView", "mainTemplate");
                    $("#flatSearchPhotos").hide();
                    $("#mainTemplate").show();
                    $("#flatMostPopularPhotos").hide();
                    $(".i-tileview").click();
                    element.text("Back to most popular");
                    slideshow.init($("#flatSearchPhotos").data("kendoListView"));

                }
                else if(view === "mainTemplate"){
                    element.data("currentView", "flatMostPopularPhotos");
                    $("#flatSearchPhotos").hide();
                    $("#mainTemplate").hide();
                    $("#overlay").fadeOut();
                    $("#exifButton").fadeIn();
                    $("#flatMostPopularPhotos").show();
                    element.text("Back to search results");
                    slideshow.init($("#flatMostPopularPhotos").data("kendoListView"));
                }
            });

            that.thumbList.append($("#flatSearchPhotos"));
        },
        initSlider: function() {
            $("#slider").kendoSlider({
                orientation: "vertical",
                min: 0,
                max: 2,
                largeStep: 1,
                change: function() {
                    var value = this.value();
                    imageSize = IMAGESIZES[value];
                    var t = template(imageSize),
                        pageSize = value === 0 ? 20 : parseInt(20 / value);
                    $("#mainPhotoStrip").data("kendoListView").template = kendo.template(t);
                    dataSource.query({page: 1, pageSize: pageSize});
                }
            })
            .parent().hide();
        },
        initVisitor: function() {
            var that = this;

            $(".i-search").click(function(e) { e.preventDefault(); that.search(); });
            $("#searchBox").bind("keydown", function(e) {
                if(e.keyCode === kendo.keys.ENTER) {
                    $(".i-search").click();
                }
            });

            that.thumbList = new kendo.ui.Scroller($('<div class="thumb-list">').appendTo("#footer")).scrollElement;

            that.mostPopular();

             $(".bottomLink").text("");

            slideshow.init($("#flatMostPopularPhotos").data("kendoListView"));

            $("#viewslideshow").click(function(e) {
                e.preventDefault();

                $(this).find(".p-icon")
                    .toggleClass("i-pause")
                    .toggleClass("i-slideshow")
                    .end()
                    .find("em").html(slideshow._started ? 'Play' : 'Pause');

                slideshow.toggle();
            });
        }
   };
})(jQuery, window);
