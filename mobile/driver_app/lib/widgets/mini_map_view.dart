import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import '../theme/app_text_styles.dart';
import 'card_container.dart';

/// A compact map container for displaying locations and markers
/// 
/// This component provides a standardized map widget that can be used
/// throughout the application for showing delivery locations, routes,
/// and other geographic information.
/// 
/// Example usage:
/// ```dart
/// MiniMapView(
///   initialPosition: LatLng(37.7749, -122.4194),
///   markers: [
///     Marker(
///       markerId: MarkerId('delivery'),
///       position: LatLng(37.7749, -122.4194),
///     ),
///   ],
///   height: 200,
/// )
/// ```
/// 
/// With interactive features:
/// ```dart
/// MiniMapView(
///   initialPosition: currentPosition,
///   markers: deliveryMarkers,
///   showCurrentLocation: true,
///   showZoomControls: true,
///   onTap: (position) => handleMapTap(position),
///   height: 300,
/// )
/// ```
class MiniMapView extends StatefulWidget {
  /// Initial camera position for the map
  final LatLng initialPosition;

  /// List of markers to display on the map
  final Set<Marker>? markers;

  /// List of polylines to display routes
  final Set<Polyline>? polylines;

  /// List of circles to display areas
  final Set<Circle>? circles;

  /// Height of the map widget
  final double? height;

  /// Width of the map widget (defaults to full width)
  final double? width;

  /// Zoom level for the initial view
  final double initialZoom;

  /// Whether to show the current location blue dot
  final bool showCurrentLocation;

  /// Whether to show the my location button (separate from blue dot)
  final bool showMyLocationButton;

  /// Whether to show zoom controls
  final bool showZoomControls;

  /// Whether to show the compass
  final bool showCompass;

  /// Whether to show the map toolbar
  final bool showMapToolbar;

  /// Whether the map can be scrolled/panned
  final bool scrollGesturesEnabled;

  /// Whether the map can be zoomed with gestures
  final bool zoomGesturesEnabled;

  /// Whether the map can be tilted
  final bool tiltGesturesEnabled;

  /// Whether the map can be rotated
  final bool rotateGesturesEnabled;

  /// Map type (normal, satellite, hybrid, terrain)
  final MapType mapType;

  /// Callback when the map is tapped
  final Function(LatLng)? onTap;

  /// Callback when a marker is tapped
  final Function(String)? onMarkerTap;

  /// Callback when the map is ready
  final Function(GoogleMapController)? onMapReady;

  /// Custom border radius
  final BorderRadius? borderRadius;

  /// Whether to show a loading indicator
  final bool isLoading;

  /// Error message to display if map fails to load
  final String? errorMessage;

  /// Widget to show when map is loading
  final Widget? loadingWidget;

  /// Widget to show when map has an error
  final Widget? errorWidget;

  /// Semantic label for accessibility
  final String? semanticLabel;

  const MiniMapView({
    super.key,
    required this.initialPosition,
    this.markers,
    this.polylines,
    this.circles,
    this.height,
    this.width,
    this.initialZoom = 15.0,
    this.showCurrentLocation = false,
    this.showMyLocationButton = true,
    this.showZoomControls = false,
    this.showCompass = false,
    this.showMapToolbar = false,
    this.scrollGesturesEnabled = true,
    this.zoomGesturesEnabled = true,
    this.tiltGesturesEnabled = false,
    this.rotateGesturesEnabled = false,
    this.mapType = MapType.normal,
    this.onTap,
    this.onMarkerTap,
    this.onMapReady,
    this.borderRadius,
    this.isLoading = false,
    this.errorMessage,
    this.loadingWidget,
    this.errorWidget,
    this.semanticLabel,
  });

  @override
  State<MiniMapView> createState() => _MiniMapViewState();
}

class _MiniMapViewState extends State<MiniMapView> {
  GoogleMapController? _mapController;

  @override
  Widget build(BuildContext context) {
    if (widget.isLoading) {
      return _buildLoadingState();
    }

    if (widget.errorMessage != null) {
      return _buildErrorState();
    }

    // When height is infinite, let the container expand
    final useExpanded = widget.height == double.infinity;

    final mapChild = ClipRRect(
          borderRadius: widget.borderRadius ?? AppSpacing.radiusCard,
          child: GoogleMap(
            initialCameraPosition: CameraPosition(
              target: widget.initialPosition,
              zoom: widget.initialZoom,
            ),
            markers: _processMarkers(),
            polylines: widget.polylines ?? {},
            circles: widget.circles ?? {},
            mapType: widget.mapType,
            myLocationEnabled: widget.showCurrentLocation,
            myLocationButtonEnabled: widget.showCurrentLocation && widget.showMyLocationButton,
            zoomControlsEnabled: widget.showZoomControls,
            compassEnabled: widget.showCompass,
            mapToolbarEnabled: widget.showMapToolbar,
            scrollGesturesEnabled: widget.scrollGesturesEnabled,
            zoomGesturesEnabled: widget.zoomGesturesEnabled,
            tiltGesturesEnabled: widget.tiltGesturesEnabled,
            rotateGesturesEnabled: widget.rotateGesturesEnabled,
            onTap: widget.onTap,
            onMapCreated: (GoogleMapController controller) {
              _mapController = controller;
              widget.onMapReady?.call(controller);
            },
            // Push the location button down to avoid overlap with card header
            padding: const EdgeInsets.only(top: 48),
          ),
    );

    // Wrap in CardContainer with appropriate sizing
    return CardContainer(
      padding: EdgeInsets.zero,
      borderRadius: widget.borderRadius ?? AppSpacing.radiusCard,
      child: useExpanded
          ? SizedBox(
              width: widget.width ?? double.infinity,
              child: mapChild,
            )
          : SizedBox(
              height: widget.height ?? 200,
              width: widget.width ?? double.infinity,
              child: mapChild,
            ),
    );
  }

  Widget _buildLoadingState() {
    if (widget.loadingWidget != null) {
      return widget.loadingWidget!;
    }

    return CardContainer(
      height: widget.height,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            'Loading map...',
            style: AppTextStyles.bodyMedium.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState() {
    if (widget.errorWidget != null) {
      return widget.errorWidget!;
    }

    return CardContainer(
      height: widget.height,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.map_outlined,
            size: 48,
            color: AppColors.textDisabled,
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            widget.errorMessage ?? 'Unable to load map',
            style: AppTextStyles.bodyMedium.copyWith(
              color: AppColors.textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Set<Marker> _processMarkers() {
    final markers = widget.markers ?? <Marker>{};

    // Add onMarkerTap callback to all markers if provided
    if (widget.onMarkerTap != null) {
      return markers.map((marker) {
        return marker.copyWith(
          onTapParam: () => widget.onMarkerTap!(marker.markerId.value),
        );
      }).toSet();
    }

    return markers;
  }

  /// Animate the camera to a specific position
  Future<void> animateToPosition(LatLng position, {double? zoom}) async {
    if (_mapController != null) {
      await _mapController!.animateCamera(
        CameraUpdate.newCameraPosition(
          CameraPosition(
            target: position,
            zoom: zoom ?? widget.initialZoom,
          ),
        ),
      );
    }
  }

  /// Animate the camera to fit all markers
  Future<void> fitMarkers({EdgeInsets padding = EdgeInsets.zero}) async {
    if (_mapController != null && widget.markers != null && widget.markers!.isNotEmpty) {
      final bounds = _calculateBounds(widget.markers!);
      await _mapController!.animateCamera(
        CameraUpdate.newLatLngBounds(bounds, 50),
      );
    }
  }

  /// Calculate the bounds that contain all markers
  LatLngBounds _calculateBounds(Set<Marker> markers) {
    double minLat = markers.first.position.latitude;
    double maxLat = markers.first.position.latitude;
    double minLng = markers.first.position.longitude;
    double maxLng = markers.first.position.longitude;

    for (final marker in markers) {
      minLat = math.min(minLat, marker.position.latitude);
      maxLat = math.max(maxLat, marker.position.latitude);
      minLng = math.min(minLng, marker.position.longitude);
      maxLng = math.max(maxLng, marker.position.longitude);
    }

    return LatLngBounds(
      southwest: LatLng(minLat, minLng),
      northeast: LatLng(maxLat, maxLng),
    );
  }
}

/// A specialized mini map for showing delivery locations
class DeliveryMapView extends StatelessWidget {
  /// Delivery destination position
  final LatLng destination;

  /// Current driver position (optional)
  final LatLng? currentPosition;

  /// Delivery route polyline (optional)
  final List<LatLng>? routePoints;

  /// Height of the map
  final double? height;

  /// Callback when the destination is tapped
  final VoidCallback? onDestinationTap;

  /// Callback when the current position is tapped
  final VoidCallback? onCurrentPositionTap;

  /// Whether to show the route
  final bool showRoute;

  /// Map is loading
  final bool isLoading;

  const DeliveryMapView({
    super.key,
    required this.destination,
    this.currentPosition,
    this.routePoints,
    this.height,
    this.onDestinationTap,
    this.onCurrentPositionTap,
    this.showRoute = true,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    final markers = <Marker>{};

    // Add destination marker
    markers.add(
      Marker(
        markerId: const MarkerId('destination'),
        position: destination,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
        onTap: onDestinationTap,
        infoWindow: const InfoWindow(
          title: 'Delivery Location',
          snippet: 'Tap for details',
        ),
      ),
    );

    // Add current position marker if provided
    if (currentPosition != null) {
      markers.add(
        Marker(
          markerId: const MarkerId('current'),
          position: currentPosition!,
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue),
          onTap: onCurrentPositionTap,
          infoWindow: const InfoWindow(
            title: 'Your Location',
            snippet: 'Current position',
          ),
        ),
      );
    }

    // Create route polyline if provided
    final polylines = showRoute && routePoints != null && routePoints!.length > 1
        ? <Polyline>{
            Polyline(
              polylineId: const PolylineId('route'),
              points: routePoints!,
              color: AppColors.primary,
              width: 4,
            ),
          }
        : null;

    return MiniMapView(
      initialPosition: currentPosition ?? destination,
      markers: markers,
      polylines: polylines,
      height: height ?? 200,
      showCurrentLocation: currentPosition == null,
      showZoomControls: false,
      scrollGesturesEnabled: true,
      zoomGesturesEnabled: true,
      isLoading: isLoading,
      onMarkerTap: (markerId) {
        if (markerId == 'destination') {
          onDestinationTap?.call();
        } else if (markerId == 'current') {
          onCurrentPositionTap?.call();
        }
      },
      semanticLabel: 'Map showing delivery location${currentPosition != null ? ' and current position' : ''}',
    );
  }
}

/// A compact location view with a single marker
class LocationPinView extends StatelessWidget {
  /// The location to display
  final LatLng position;

  /// Title for the location
  final String title;

  /// Subtitle for the location
  final String? subtitle;

  /// Height of the map
  final double height;

  /// Color for the marker
  final Color markerColor;

  /// Callback when the location is tapped
  final VoidCallback? onTap;

  /// Whether to show the location details
  final bool showDetails;

  const LocationPinView({
    super.key,
    required this.position,
    required this.title,
    this.subtitle,
    this.height = 150,
    this.markerColor = AppColors.primary,
    this.onTap,
    this.showDetails = true,
  });

  @override
  Widget build(BuildContext context) {
    final marker = BitmapDescriptor.defaultMarkerWithHue(
      markerColor == AppColors.primary
          ? BitmapDescriptor.hueAzure
          : markerColor == AppColors.error
              ? BitmapDescriptor.hueRed
              : markerColor == AppColors.success
                  ? BitmapDescriptor.hueGreen
                  : BitmapDescriptor.hueAzure,
    );

    return CardContainer(
      padding: EdgeInsets.zero,
      onTap: onTap,
      child: Column(
        children: [
          SizedBox(
            height: height,
            child: MiniMapView(
              initialPosition: position,
              markers: {
                Marker(
                  markerId: MarkerId(title),
                  position: position,
                  icon: marker,
                ),
              },
              height: height,
              showZoomControls: false,
              scrollGesturesEnabled: false,
              zoomGesturesEnabled: false,
            ),
          ),
          if (showDetails) ...[
            const SizedBox(height: AppSpacing.md),
            Padding(
              padding: AppSpacing.paddingHorizontalMD,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: AppTextStyles.titleMedium.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      subtitle!,
                      style: AppTextStyles.bodySmall.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
          ],
        ],
      ),
    );
  }
}