import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

class SignaturePadWidget extends StatefulWidget {
  final Function(Uint8List?) onSigned;
  final Color penColor;
  final double strokeWidth;

  const SignaturePadWidget({
    super.key,
    required this.onSigned,
    this.penColor = Colors.black,
    this.strokeWidth = 3.0,
  });

  @override
  State<SignaturePadWidget> createState() => _SignaturePadWidgetState();
}

class _SignaturePadWidgetState extends State<SignaturePadWidget> {
  final List<List<Offset>> _strokes = [];
  List<Offset> _currentStroke = [];

  void _onPanStart(DragStartDetails details) {
    setState(() {
      _currentStroke = [details.localPosition];
    });
  }

  void _onPanUpdate(DragUpdateDetails details) {
    setState(() {
      _currentStroke.add(details.localPosition);
    });
  }

  void _onPanEnd(DragEndDetails details) {
    setState(() {
      _strokes.add(List.from(_currentStroke));
      _currentStroke = [];
    });
  }

  void clear() {
    setState(() {
      _strokes.clear();
      _currentStroke.clear();
    });
    widget.onSigned(null);
  }

  Future<Uint8List?> getSignatureImage() async {
    if (_strokes.isEmpty) {
      return null;
    }

    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    final paint = Paint()
      ..color = widget.penColor
      ..strokeWidth = widget.strokeWidth
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    // Draw white background
    canvas.drawRect(
      const Rect.fromLTWH(0, 0, 300, 150),
      Paint()..color = Colors.white,
    );

    // Draw strokes
    for (final stroke in _strokes) {
      if (stroke.length < 2) {
        continue;
      }
      final path = Path()..moveTo(stroke.first.dx, stroke.first.dy);
      for (int i = 1; i < stroke.length; i++) {
        path.lineTo(stroke[i].dx, stroke[i].dy);
      }
      canvas.drawPath(path, paint);
    }

    final picture = recorder.endRecording();
    final image = await picture.toImage(300, 150);
    final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
    return byteData?.buffer.asUint8List();
  }

  Future<void> saveSignature() async {
    final bytes = await getSignatureImage();
    widget.onSigned(bytes);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          height: 150,
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey),
            borderRadius: BorderRadius.circular(8),
            color: Colors.white,
          ),
          child: GestureDetector(
            onPanStart: _onPanStart,
            onPanUpdate: _onPanUpdate,
            onPanEnd: _onPanEnd,
            child: CustomPaint(
              painter: _SignaturePainter(
                strokes: _strokes,
                currentStroke: _currentStroke,
                penColor: widget.penColor,
                strokeWidth: widget.strokeWidth,
              ),
              size: Size.infinite,
            ),
          ),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            TextButton.icon(
              onPressed: clear,
              icon: const Icon(Icons.clear),
              label: const Text('Clear'),
            ),
            ElevatedButton.icon(
              onPressed: saveSignature,
              icon: const Icon(Icons.check),
              label: const Text('Confirm'),
            ),
          ],
        ),
      ],
    );
  }
}

class _SignaturePainter extends CustomPainter {
  final List<List<Offset>> strokes;
  final List<Offset> currentStroke;
  final Color penColor;
  final double strokeWidth;

  _SignaturePainter({
    required this.strokes,
    required this.currentStroke,
    required this.penColor,
    required this.strokeWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = penColor
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    for (final stroke in [...strokes, currentStroke]) {
      if (stroke.length < 2) {
        continue;
      }
      final path = Path()..moveTo(stroke.first.dx, stroke.first.dy);
      for (int i = 1; i < stroke.length; i++) {
        path.lineTo(stroke[i].dx, stroke[i].dy);
      }
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(covariant _SignaturePainter oldDelegate) {
    // Only repaint if strokes or current stroke actually changed
    return strokes != oldDelegate.strokes ||
        currentStroke != oldDelegate.currentStroke;
  }
}
