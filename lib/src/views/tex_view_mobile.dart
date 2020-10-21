import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_tex/flutter_tex.dart';
import 'package:flutter_tex/src/utils/core_utils.dart';
import 'package:webview_flutter_plus/webview_flutter_plus.dart';

class TeXViewState extends State<TeXView> with AutomaticKeepAliveClientMixin {
  WebViewPlusController _controller;
  double _height = 1;
  double _width = 10;
  String _lastData;
  bool _pageLoaded = false;

  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context);
    updateKeepAlive();
    _buildTeXView();

    return IndexedStack(
      index: widget.loadingWidgetBuilder?.call(context) != null
          ? _height == 1
              ? 1
              : 0
          : 0,
      children: <Widget>[
        SizedBox(
          height: _height,
          width: _width,
          child: WebViewPlus(
            initialUrl:
                "packages/flutter_tex/js/${widget.renderingEngine?.name ?? 'katex'}/index.html",
            onWebViewCreated: (controller) {
              this._controller = controller;
            },
            javascriptChannels: jsChannels(),
            javascriptMode: JavascriptMode.unrestricted,
          ),
        ),
        widget.loadingWidgetBuilder?.call(context) ?? SizedBox.shrink()
      ],
    );
  }

  Set<JavascriptChannel> jsChannels() {
    return Set.from([
      JavascriptChannel(
          name: 'TeXViewRenderedCallback',
          onMessageReceived: (_) async {
            double height = await _controller.getHeight();
            double width = await getWidth();

            if (this._height != height && _width != width)
              setState(() {
                this._height = height;
                this._width = width;
              });
            widget.onRenderFinished?.call(height);
          }),
      JavascriptChannel(
          name: 'OnTapCallback',
          onMessageReceived: (jm) {
            widget.child.onTapManager(jm.message);
          }),
      JavascriptChannel(
          name: 'OnPageLoaded',
          onMessageReceived: (jm) {
            _pageLoaded = true;
            _buildTeXView();
          })
    ]);
  }

  void _buildTeXView() {
    if (_pageLoaded && _controller != null && getRawData(widget) != _lastData) {
      if (widget.loadingWidgetBuilder != null) _height = 1;
      _controller.evaluateJavascript(
          "var jsonData = " + getRawData(widget) + ";initView(jsonData);");
      this._lastData = getRawData(widget);
    }
  }

  /// Return the width of [WebViewPlus]
  Future<double> getWidth() async {
    if (_controller == null) return 1;

    String getWidthScript = r"""
    getWebviewFlutterPlusWidth();
    function getWebviewFlutterPlusWidth(){
    var element = document.getElementsByClassName('tex-view-document')[0].children[0];

    var width = element.offsetWidth,
        style = window.getComputedStyle(element)
    return ['left', 'right']
        .map(function (side) {
            return parseInt(style["margin-" + side]);
        })
        .reduce(function (total, side) {
            return total + side;
        }, width)}""";

    return double.parse(await _controller.evaluateJavascript(getWidthScript));
  }
}
