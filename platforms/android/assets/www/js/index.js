var app = {
    // Application Constructor
    initialize: function() {
        if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry)/)) {
            document.addEventListener("deviceready", this.onDeviceReady, false);
        } else {
            this.onDeviceReady();
        }
    },

    onDeviceReady: function() {
        // We will init / bootstrap our application here
    },
};
app.initialize();

$('form').submit(function(){
    
    var q = $('#q1').attr('data-spark-query').replace("{room1}", $('#as-values-v1').val()).replace("{room2}", $('#as-values-v2').val());
    q=q.replace(new RegExp(",>","g"), ">");
 	$.spark($("#q1"), {
				"endpoint":$('#q1').attr('data-spark-endpoint'),
            	"format":"http://km.aifb.kit.edu/sites/spark/src/jquery.spark.simpletable.js",
            	"query": q,
            	"param": {
            	}
			});
    
    return false;
});
        var settings = {
            'dbpedia_lookup_url' : 'http://lod.nik.uni-obuda.hu/marmotta/sparql',//'http://lookup.dbpedia.org/api/search/KeywordSearch',
            'elastic_search_root_url' : 'http://spotlight.sztaki.hu:9200/gsoc2013/d/',  // must include index and type
            'spotlight_related_url' : 'http://spotlight.dbpedia.org/related/'
        };

        $(document).ready(function() {
            $("#room1").autoSuggest(settings.dbpedia_lookup_url, {
                    minChars: 2,
                    asHtmlID: "v1",
                    matchCase: false,
                    queryParam: "query",
                    extraParams: "&output=json",
                    selectedItemProp: "label",
                    searchObjProps: "label",
                    selectedValuesProp: "uri",
                    startText: "Enter keywords...",
                    emptyText: "No topics found for that phrase.",
                    beforeRetrieve: function(s) {
                        return s.replace(/\+/g, "\\\+");
                    },
                    retrieveComplete: function(data) {
                        var result = new Array();
						$.each(data.results.bindings, function() {
        					result.push({label: this.label.value, uri: this.subject.value});
    					});
                        return result;
                    }
            });
            $("#room2").autoSuggest(settings.dbpedia_lookup_url, {
                    minChars: 2,
                    asHtmlID: "v2",
                    matchCase: false,
                    queryParam: "query",
                    extraParams: "&output=json",
                    selectedItemProp: "label",
                    searchObjProps: "label",
                    selectedValuesProp: "uri",
                    startText: "Enter keywords...",
                    emptyText: "No topics found for that phrase.",
                    beforeRetrieve: function(s) {
                        return s.replace(/\+/g, "\\\+");
                    },
                    retrieveComplete: function(data) {
                        var result = new Array();
						$.each(data.results.bindings, function() {
        					result.push({label: this.label.value, uri: this.subject.value});
    					});
                        return result;
                    }
            });
        });

        function expand() {
            var uriList = getInputConcepts();
            var data = {"uri": uriList.join(" "),
                        "n": 20 }
            $.get(settings.spotlight_related_url, data, suggest, "json")
        }

        function uriToLabel(uri) {
            return decodeURIComponent(uri).replace(/_/g, " ");
        }

        function suggest(content) {
            //var nHits = $("#nHits").val();
            var nHits = 20;
            console.log(content);
            var suggestions = content.sort(function(a, b) {
                return b[Object.keys(b)] - a[Object.keys(a)];
            }).slice(0,nHits);
            var values = suggestions.map(function(e) {  return "http://dbpedia.org/resource/"+Object.keys(e); }).join(",");
            var hidden = '<input class="as-values" type="hidden" value="'+values+'">';
            var header = '<ul class="as-expansions">';
            var body = [];
            $(suggestions).each(function (i,e) {
                body.push('<li class="as-selection-item selected">'+uriToLabel(Object.keys(e))+'</li>');
            });
            var footer = "</ul>";

            $("#expansion").append(hidden+header+body.join("\n")+footer);
            run();
        }

        function update(json) {
            if (json.hits == undefined) {
                json = $.parseJSON(json);
            }

            var columns = ["name", "ideas"];

            var header = "<table id='results' class='table table-bordered table-striped'><thead>";
            $.each(columns, function (i, val) {
                header += "<th>"+val+"</th>";
            });
            header += "<th>"+"score"+"</th>";  // score has to be 3rd column; otherwise adjust aaSorting!
            header += "</thead>";
            
            var body = "<tbody>";
            $.each(json.hits.hits, function(i, element) {
                body += "<tr>";
                $.each(columns, function (j, col) {
                    var t = element._source[col];
                    if (t.match(/^(http|https):\/\//)) {
                      t = '<a href="'+t+'">'+t+'</a>';
                    } else if (col === "name") {
                      var linkId = element._id.replace(/_/g, "/")
                      t = '<a href="http://www.google-melange.com/gsoc/org/'+linkId+'">'+t+'</a>';
                    }
                    body += "<td>"+t+"</td>";
                });
                body += "<td>"+element._score+"</td>";
                body += "</tr>";
            });
            body += "</tbody>";

            // insert a table
            $('#view').html(header+body);

            $('#results').dataTable({"oLanguage": {
      			"sInfoEmpty": "No projects found for those topics. Try clicking on the <a href='javascript:expand()'>expand</a> button or adding more keywords.",
                "sEmptyTable": "No projects found for those topics. Try clicking on the <a href='javascript:expand()'>expand</a> button or adding more keywords."},
                "aaSorting": [[2, "desc"]],  // sort by score
            });

        }

        function search(concepts) {
            var url = settings.elastic_search_root_url + '_search'
            var fields = ['tagged', 'textTagged'];
            var qArray = [];
            $.each(fields, function(i, field) {
                $.each(concepts, function(j, concept) {
                    qArray.push(field + ':"' + concept + '"');
                })
            });
            var luceneQuery = qArray.join(' OR ');
            var data = {
                q : luceneQuery,
                from : 0,
                size : 300   // all results at once
            };
            $.ajax({
                type: 'GET',
                url: url,
                data: data,
                success: update,
                dataType: "json"
            })
        }

        /**
          * Returns array of URI strings from the input box .as-values.
          */
        function getInputConcepts() {
            var conceptsArr = [];
            $('.as-values').each(function(i, e) {
                $(e.value.split(",")).each(function (i, entity) {
                    if (entity !== "") {
                        conceptsArr.push(entity);
                    }
                });
            });
            //var strVal = $('.as-values')[0].value;
            //var conceptsArr = strVal.split(",").filter(function (x) { return x !== "" });
            return conceptsArr;
        }

        function run() {
            search(getInputConcepts());
        }

