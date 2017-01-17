/**
 * Copyright (C) 2014 Dominik Jäckle <dominik.jaeckle@uni-konstanz.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR I
 * MPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * Basic Plugin providing basic functions, partly based on JQUERY
 * Make sure to link to JQUERY before this plugin
 * 
 * Components:
 * - Listener Component
 * - Breadcrumb design pattern
 * - My often used d3 colormaps
 * - d3 fill the domain() function
 * - AJAX Request for JSON, XML, ... async and sync
 * - 
 * 
 * @return {[SH or shorty]} [Shorty Plugin - use SH or shorty or _s to access]
 */
(function () {
	var SH = function(param) { // main Library identifier
		return new Shorty(param);
	};
	var shorty = SH; // also accessible by keyname shorty
	var _s = SH; // also accessible by keyname _s

	SH.version = "v_1.0";
	SH.getVersion = function() {
		return SH.version;
	};
        
        /**
         * Usage Listener Concept:
         * 1) define listener - it will automatically be assigned to a listenerMap
         *      // var listener = new _s.Listener("testListener");
         * 2) define handler method and add it to listener
         *      // var handler = function(e) {... code goes here...}
         *      // listener.subscribe(handler);
         * 2.1) OR access listener via identifier
         *      // _s.listenerMap['testListener'].subscribe(handler);
         * 3) Fire event, event can be any kind of type/object
         *      // listener.fire({x: 'xCoordinateExample});
         * 3.1) OR use access via identifier to access it from somewhere else
         *      // _s.listenerMap['testListener'].fire({x: 'xCoordinateExample});
         */
        SH.listenerMap = {
            removeListener: function(identifier) {
                delete SH.listenerMap[identifier];
            }
        };
        SH.Listener = function(identifier) {
            SH.listenerMap[identifier] = this; // register this listener
            this.handlers = [];
        };
        SH.Listener.prototype = {
            subscribe: function(fn) {
                this.handlers.push(fn);
            },
            unsubscribe: function(fn) {
                this.handlers = this.handlers.filter(
                    function(item) {
                        if (item !== fn) {
                            return item;
                        }
                    });
            },
            fire: function(o, thisObj) {
                var scope = thisObj || window;
                this.handlers.forEach(function(item) {
                    item.call(scope, o);
                });
            }
        };
        
        /**
         * Breadcrumb implementation with callback function.
         * Usage:
         * 1) create crumb object and add callback function
         *      // var bc = new _s.Breadcrumb(parent);
         *      // var cProxy = {callback: $.proxy(function() { .. put code here .. }, this)}; // preserves this. context
         *      // var crumb = {id: 1, name: "First", callback: cProxy.callback};
         *      // bc.addCrumb(crumb);
         * 2) execute active crumb
         *      // bc.setActive(1, null); // use eitehr id or name
         * 
         * @param {String} parent Class or ID or DOM Element
         */
        SH.Breadcrumb = function(parent) {
            this.parent = parent;
            this.crumbs = {};
            this.activeCrumb = null;
            
            this.addCrumb = function(crumbObj) {
                this.crumbs[crumbObj.id] = crumbObj;
            };
            this.removeCrumb = function(id, name) {
                if (id !== null) {delete this.crumbs[id];}
                else if (name !== null) {
                    var tmpID = -1;
                    $.each(this.crumbs, function(k, v) {
                        if (name === v.name) {tmpID = k; return false;}
                    });
                    if (tmpID !== -1) delete this.crumbs[tmpID];
                }
            };
            this.setActive = function(id, name) {
                var _self = this;
                this.activeCrumb = null;
                if (id !== null) {
                    this.activeCrumb = this.crumbs[id];
                } else if (name !== null) {
                    var crumb = null;
                    $.each(this.crumbs, function(k, v) {
                        if (name === v.name) {
                            crumb = v;
                            return false;
                        }
                    });
                    this.activeCrumb = crumb;
                }
                // show active crumb
                if (this.activeCrumb === null) return;
                // callback function if breadcrumb has been clicked
                var clickCallback = function(id) {
                    return function() { _self.setActive(id, null); }
                }
                // empty parent = reset crumbs and set new order
                $(this.parent).empty();
                for (var i = 0; i <= this.activeCrumb.id; ++i) {
                    $(this.parent).append(
                            '<div class="bcItem">' + 
                            '   <button class="bc_' + _self.crumbs[i].id + '" type="button">' + 
                                    _self.crumbs[i].name + 
                            '   </button>' + 
                            '</div>'
                    );
                    // add recursive click handler
                    $('.bc_' + _self.crumbs[i].id).on('click', clickCallback(_self.crumbs[i].id));
                }
                // finally call callback function
                this.activeCrumb.callback(_self.activeCrumb);
            };
        };
        
        /**
         * Common Colormaps I am using. Usage e.g.: 
         *      // var cMap = _s.d3ColorMaps.HONEYCOMB;
         *      // 
         */
        SH.d3ColorMaps = {
            HONEYCOMB: ["black", "#FF8C00", "yellow", "white"],
            COPPER: ["black", "chocolate", "burlywood", "white"],
            YELLOW_TO_RED: ["#ffffb2", "#fecc5c", "#fd8d3c", "#e31a1c"],
            HEAT: ["black", "#feb24c", "#f03b20"]
        };
        
        /**
         * Used to fill the d3.domain() array. Usage: 
         *      // d3.scale.linear().domain(_sh.d3DomainArray(0, 10, 3));
         * 
         * @param {Number} min
         * @param {Number} max
         * @param {Number} steps
         * @returns {Array}
         */
        SH.d3DomainArray = function(min, max, steps) {
            var domain = [];
            for (var i = 0; i < steps; ++i) {
                domain.push(min + (i * (max-min) / (steps - 1)));
            }
            return domain;
        };

	/**
	 * Ajax Request
	 * Standard Options: POST, no async, crossdomain, JSON
         * 
         * @param {String} data
         * @param {String} host
         * @param {String} options
         * @returns {String}
         */
	SH.ajax = function(data, host, options) {
		var sett = $.extend({
			type: "POST",
			async: false,
			crossDomain: true,
			contentType: "application/json",
			charset: "charset=utf-8",
			callback: null
		}, options);

		var dataToSend = data;
		if (sett.contentType === "application/json")
			dataToSend = JSON.stringify(data);

		// send and retrieve
		var result = null;
		$.ajax({
			url: host,
			type: sett.type,
			crossDomain: sett.crossDomain,
			contentType: sett.contentType + "; " + sett.charset,
			data: dataToSend,
			async: sett.async,
			success: function(data, textStatus, jqXHR) {
				if (sett.callback !== null)
					sett.callback(data);
				result = data; 
			},
			error: function(xhr, ajaxOptions, thrownError) {
				throw "Error: " + xhr.status + '\n' + thrownError;
			}
		});
		return result;
	};

	/**
	 * CSS handling
         * 
         * Usage:
         * 1) define css class
         *      // _s.CSS.css.someID = ["some_id", _s.CSS.type.ID];
         * 2) access it, class or id will be resolved automatically
         *      // _s.CSS.css.get(_s.CSS.css.someID);
	 */
	SH.CSS = {
		type: {CLASS: "class", ID: "id"},
		css: {},
		add: function(key, value, type) {
			SH.CSS.css[key] = [value, type];
		},
		get: function(ident) {
			switch(ident[1]) {
				case SH.CSS.type.CLASS:
					return ('.' + ident[0]);
				case SH.CSS.type.ID:
					return ('#' + ident[0]);
				default:
					return ident[0];
			}
		},
		getClass: function(value) {
			return '.' + value;
		},
		getID: function(value) {
			return '#' + value;
		}
	};
	// create root element
	SH.CSS.css.root = ["content", SH.CSS.type.ID];
        
        // ----------------------------- TESTING ONLY -------------------------
	/**
	 * Shorty Selection-based plugin part. Post selection within param
	 * @param {[String]} param [class id or element identifier]
	 */
	var Shorty = function(param) {
		var selector = document.querySelectorAll(param);
		// store selections
		for (var i = 0; i < selector.length; ++i) {
			this[i] = selector[i];
		}
	};
	// Lib Obj Extensions
	SH.fn = Shorty.prototype = {
		test: function() {
			console.log("test called");
		}
	};
        // ----------------------------- TESTING END --------------------------

	// bind shorty variable to window
	if (!window.SH) {window.SH = SH; window.shorty = shorty; window._s = _s;}
})();