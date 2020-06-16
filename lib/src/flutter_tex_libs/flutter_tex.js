"use strict";
var configurations = JSON.parse(getUrlParam('configurations'));
var port = getUrlParam('port');
var isWeb = port == null;
var teXView;
var listeningPlatformViews = [];

function initTeXView() {
    var httpRequest = new XMLHttpRequest();
    httpRequest.onreadystatechange = function () {
        if (httpRequest.readyState === 4 && httpRequest.status === 200) {
            teXView.appendChild(createView(JSON.parse(httpRequest.responseText)));
            onTeXViewRenderComplete(function () {
                RenderedTeXViewHeight.postMessage(getTeXViewHeight(teXView), getTeXViewWidth(teXView));
            });
        }
    }
    httpRequest.open('GET', "http://localhost:" + port + "/rawData");
    httpRequest.send();
}

function listenForDOMNodeRemoved(viewId, rawData) {
    if(listeningPlatformViews.length == 0 || !listeningPlatformViews.includes(viewId)) {
        listeningPlatformViews.push(viewId);
        document.body.addEventListener('DOMNodeRemoved', (e) => {
            if (e.target.innerHTML && e.target.innerHTML.search(/flt-platform-view/)) {
                let platformViews = e.target.querySelectorAll("flt-platform-view");

                if(platformViews && platformViews.length) {
                    platformViews.forEach((platformView) => {
                        let view = platformView.shadowRoot.children[1];

                        if(view && view.id == 'tex_view_' + viewId) {
                            initWebTeXView(viewId, rawData);
                            console.log(listeningPlatformViews.toString());
                            console.log("viewId -> " + view.id + " was removed" );
                        }
                    });
                }
            }
        });
    }
}

function initWebTeXView(viewId, rawData) {
    var initiated = false;
    var lastData;
    var maxRetry = 30;
    var retryTimer;
    console.log("initWebTeXView Call");
    
    listenForDOMNodeRemoved(viewId, rawData);

    document.querySelectorAll("flt-platform-view").forEach(function (platformView) {
            var view = platformView.shadowRoot.children[1];
            if (view.id === 'tex_view_' + viewId) {
                var iframe = view.contentWindow;
                teXView = iframe.document.getElementById('TeXView');
                if (teXView != null) {
                    
                    initiated = true;
                    if (lastData !== rawData) {
                        teXView.innerHTML = "";
                        teXView.appendChild(createView(JSON.parse(rawData)))
                        iframe.onTeXViewRenderComplete(function () {
                            RenderedTeXViewHeight(getTeXViewHeight(teXView), getTeXViewWidth(teXView));
                        });
                        lastData = rawData;
                    }
                }
            }
        }
    );
    if (!initiated) {
        retryTimer = setTimeout(function () {
            maxRetry = maxRetry - 1;
            if(maxRetry) {
                console.log("initWebTeXView Timeout Call" + viewId);
                initWebTeXView(viewId, rawData);
            } else {
                console.log("Clear Timeout Call" + viewId);
                clearTimeout(retryTimer);
            }
        }, 250);
    }
}


function createView(viewData) {
    var meta = viewData['meta'];
    var data = viewData['data'];
    var node = meta['node'];
    var element = document.createElement(meta['tag']);
    element.classList.add(meta['type']);
    element.setAttribute("style", viewData['style']);
    switch (node) {
        case 'leaf': {
            if (meta['tag'] === 'img') {
                if (meta['type'] === 'tex-view-asset-image') {
                    element.setAttribute('src', 'http://localhost:' + port + '/' + data);
                } else {
                    element.setAttribute('src', data);
                    element.addEventListener("load", function () {
                        if (isWeb) {
                            RenderedTeXViewHeight(getTeXViewHeight(teXView), getTeXViewWidth(teXView));
                        } else {
                            RenderedTeXViewHeight.postMessage(getTeXViewHeight(teXView), getTeXViewWidth(teXView));
                        }
                    });
                }
            } else {
                element.innerHTML = data;
            }
        }
            break;
        case 'internal_child': {
            element.appendChild(createView(data))
            var id = viewData['id'];
            if (meta['type'] === 'tex-view-ink-well' && id != null) rippleManager(element, id);
        }
            break;
        default: {
            data.forEach(function (childViewData) {
                element.appendChild(createView(childViewData))
            });
        }
    }
    return element;
}


function rippleManager(element, id) {
    element.addEventListener('click', function (e) {
        if (isWeb) {
            OnTapCallback(id);
        } else {
            OnTapCallback.postMessage(id);
        }
        var ripple = document.createElement('div');
        this.appendChild(ripple);
        var d = Math.max(this.clientWidth, this.clientHeight);
        ripple.style.width = ripple.style.height = d + 'px';
        var rect = this.getBoundingClientRect();
        ripple.style.left = e.clientX - rect.left - d / 2 + 'px';
        ripple.style.top = e.clientY - rect.top - d / 2 + 'px';
        ripple.classList.add('ripple');
    });
}

function getUrlParam(key) {
    var url = decodeURI(location.href);
    key = key.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + key + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function getTeXViewHeight(element) {
    var height = element.offsetHeight,
        style = window.getComputedStyle(element)
    return ['top', 'bottom']
        .map(function (side) {
            return parseInt(style["margin-" + side]);
        })
        .reduce(function (total, side) {
            return total + side;
        }, height)
}

function getTeXViewWidth(element) {
    var width = element.offsetWidth,
    style = window.getComputedStyle(element)
return ['right', 'left']
    .map(function (side) {
        return parseInt(style["margin-" + side]);
    })
    .reduce(function (total, side) {
        return total + side;
    }, width)
}

function getElementWidthById(id) {
    document.querySelectorAll("flt-platform-view").forEach(function (platformView) {
        var view = platformView.shadowRoot.children[1];
        if (view.id === 'tex_view_' + id) {
            var iframe = view.contentWindow;
            teXView = iframe.document.getElementById('TeXView');
            return teXView.offsetWidth || 200;
        }else {
            return  200;
        }
    }
    );
}
