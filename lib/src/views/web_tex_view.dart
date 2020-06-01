import 'dart:html' as html;
import 'dart:js' as js;
import 'dart:ui' as ui;
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_tex/flutter_tex.dart';
import 'package:flutter_tex/src/utils/core_utils.dart';

class TeXViewState extends State<TeXView> with AutomaticKeepAliveClientMixin {
  String _lastData;
  double _height = 50;
  double _width = 100;
  bool _isIntialPageRendered = false;

  String viewId = UniqueKey().toString();

  @override
  bool get wantKeepAlive => widget.keepAlive ?? true;

  @override
  Widget build(BuildContext context) {
    super.build(context);
    // _initTeXView();
    // updateKeepAlive();

    return SizedBox(
        height: _height,
        width: _width,
        child: HtmlElementView(
          key: Key(viewId.toString()),
          viewType: viewId.toString(),
        ));
  }

  String getRawData() {
    return CoreUtils.getRawData(widget.children, widget?.style);
  }
  
  @override
  void didUpdateWidget(Widget oldWidget) {
    _initTeXView();
  }

  @override
  void initState() {
    super.initState();
    _initTeXView();

    js.context['RenderedTeXViewHeight'] = (height) {
      print(height.toString());
      print(_height.toString());
      print('_isIntialPageRendered - > ' + _isIntialPageRendered.toString());
      String width = js.context.callMethod('getElementWidthById', [viewId.toString()]);

      if (!_isIntialPageRendered) {
        setState(() {
          _height = double.parse(height.toString());
          _width = double.parse(width.toString());
          _isIntialPageRendered = true;
        });

        new Timer(const Duration(milliseconds: 400), () {
          _initTeXView();
        });
      }
    };
    js.context['OnTapCallback'] = (id) {
      if (widget.onTap != null) {
        widget.onTap(id);
      }
    };
  }

  void _initTeXView() {
    print("_initTeXView");
    if (getRawData() != _lastData || true) {
      print("==============_initTeXView==============");

      // ignore: undefined_prefixed_name
      ui.platformViewRegistry.registerViewFactory(
          viewId.toString(),
          (int id) => html.IFrameElement()
            ..src =
                "assets/packages/flutter_tex/src/flutter_tex_libs/${widget.renderingEngine.getEngineName()}/index.html"
            ..id = 'tex_view_$viewId'
            ..style.border = 'none');
      js.context.callMethod('initWebTeXView', [viewId, getRawData()]);
      this._lastData = getRawData();
    }
  }
}
