import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

class MapWidget extends StatefulWidget {
  final LatLng? initialLocation;
  final Set<Marker> markers;

  const MapWidget({
    super.key,
    this.initialLocation,
    this.markers = const {},
  });

  @override
  State<MapWidget> createState() => _MapWidgetState();
}

class _MapWidgetState extends State<MapWidget> {
  GoogleMapController? _controller;

  // Default to Kuwait City center if no location provided
  static const LatLng _defaultLocation = LatLng(29.3759, 47.9774); // Kuwait

  /// Returns the map controller if available
  GoogleMapController? get controller => _controller;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        GoogleMap(
          initialCameraPosition: CameraPosition(
            target: widget.initialLocation ?? _defaultLocation,
            zoom: 14.0,
          ),
          markers: widget.markers,
          myLocationEnabled: true,
          myLocationButtonEnabled: false, // Disable default button
          zoomControlsEnabled: false,
          onMapCreated: (GoogleMapController controller) {
            _controller = controller;
          },
        ),
        Positioned(
          bottom: 110, // Positioned at bottom right, above status toggle
          right: 16,
          child: FloatingActionButton(
            backgroundColor: Colors.white,
            child: const Icon(Icons.my_location, color: Colors.blue),
            onPressed: () async {
              if (_controller != null) {
                // TODO: Get actual current location
                // For now, just center on initial location or default
                 _controller!.animateCamera(
                  CameraUpdate.newLatLng(widget.initialLocation ?? _defaultLocation),
                );
              }
            },
          ),
        ),
      ],
    );
  }
}

