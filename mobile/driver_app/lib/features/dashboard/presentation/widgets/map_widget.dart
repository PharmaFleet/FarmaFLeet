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
  late GoogleMapController _controller;
  
  // Default to a central location (e.g. city center) if no location provided
  static const LatLng _defaultLocation = LatLng(37.7749, -122.4194); // SF

  @override
  Widget build(BuildContext context) {
    return GoogleMap(
      initialCameraPosition: CameraPosition(
        target: widget.initialLocation ?? _defaultLocation,
        zoom: 14.0,
      ),
      markers: widget.markers,
      myLocationEnabled: true,
      myLocationButtonEnabled: true,
      zoomControlsEnabled: false,
      onMapCreated: (GoogleMapController controller) {
        _controller = controller;
      },
    );
  }
}
