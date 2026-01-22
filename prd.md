# PharmaFleet Product Requirements Document

## Document information

**Version:** 1.0  
**Last updated:** January 21, 2026  
**Product owner:** Pharmacy Operations Team  
**Document status:** Draft for review

## Product overview

### Product summary

PharmaFleet is a delivery management system designed for Al-Dawaeya and Biovit pharmacy groups in Kuwait. The system streamlines the process of assigning delivery orders to drivers through a web-based dashboard for managers and a mobile application for drivers. Currently, pharmacy orders are exported from Microsoft Dynamics 365 CRM as Excel files, and managers manually coordinate driver assignments and track deliveries. PharmaFleet will digitize this workflow, providing real-time visibility into order status, driver locations, and delivery performance while maintaining the manual assignment approach that managers prefer.

The system consists of two primary applications: a web dashboard for managers to import orders, assign them to drivers, track delivery progress, and generate analytics; and an Android mobile application for drivers to receive assignments, navigate to customers, update delivery status, and collect proof of delivery. The solution addresses critical business needs including reduced delivery times, improved driver utilization, enhanced customer satisfaction, and significant reduction in manual coordination effort.

## Goals

### Business goals

The primary business objectives for PharmaFleet are to reduce delivery coordination time by eliminating phone calls and manual tracking, improve driver utilization through better visibility of driver availability and workload distribution, and enhance operational efficiency by providing real-time insights into delivery performance across all 14 pharmacy locations. The system aims to reduce failed deliveries through better information sharing with drivers, enable data-driven decision making through comprehensive analytics and reporting, and support business growth by creating a scalable foundation that can handle increasing order volumes as the pharmacy group expands over the next 2-3 months. Additionally, the platform will improve accountability through digital proof of delivery and complete order history tracking, while reducing errors associated with manual data entry and coordination.

### User goals

Managers need to quickly import orders from Excel files and assign them to available drivers with minimal effort. They require real-time visibility into all active orders and driver locations on a map interface, the ability to track order status throughout the delivery lifecycle, and access to comprehensive reports on driver performance and delivery metrics. Managers also need to handle exceptions efficiently, such as reassigning rejected orders or managing drivers who go offline unexpectedly, and require role-based access to ensure appropriate permissions across executive, warehouse management, and dispatcher roles.

Drivers need to receive clear delivery assignments with complete customer information including addresses and phone numbers, easy access to navigation for reaching customer locations, the ability to update order status as they progress through pickups and deliveries, and a simple method to collect proof of delivery. They also need the capability to communicate issues through order rejection with explanatory notes, work offline in areas with poor connectivity, and manage their availability status to control when they receive new assignments.

### Non-goals

PharmaFleet will not integrate directly with Microsoft Dynamics 365 CRM, as order export will continue to be a manual Excel-based process. The system will not include customer-facing features such as order tracking, delivery notifications, or customer communication channels. Automatic order assignment algorithms based on proximity or optimization are explicitly out of scope, as managers prefer to maintain manual control over driver assignments. The initial version will not include iOS application support, focusing exclusively on Android devices. The system will not handle inventory management, order fulfillment, or pharmacy operations beyond the delivery coordination scope. Additionally, automated route optimization and advanced scheduling features are not included in this version.

## User personas

### Key user types

The system serves three distinct user groups: managers who coordinate deliveries and oversee operations, drivers who execute deliveries, and executive stakeholders who monitor performance. Managers include warehouse managers responsible for specific pharmacy locations, dispatchers who handle day-to-day order assignment, and super administrators who manage the entire system. Drivers are delivery personnel operating across Kuwait, each potentially assigned to specific warehouses or working flexibly across locations. Executives are senior leadership who require read-only access to dashboards and reports for strategic oversight.

### Manager persona

Managers are pharmacy operations staff responsible for ensuring timely and accurate delivery of customer orders. They work in fast-paced environments where they need to make quick decisions about driver assignments, handle multiple concurrent deliveries, and respond to delivery exceptions. Managers have varying levels of technical proficiency but need an intuitive interface that allows them to accomplish tasks quickly. They typically work during business hours but may need to access the system outside normal hours to handle urgent situations. Warehouse managers focus on their specific pharmacy location, while dispatchers may coordinate across multiple locations. All manager roles need visibility into driver performance to make informed assignment decisions and identify training opportunities.

### Driver persona

Drivers are mobile workers who spend their day traveling across Kuwait delivering pharmacy orders to customers. They use company-provided or personal Android devices and need a simple, efficient mobile application that doesn't distract from driving. Drivers have varying levels of smartphone proficiency, so the application must be intuitive and easy to navigate. They work in areas with inconsistent cellular connectivity and need offline functionality. Drivers are measured on delivery success rates and customer satisfaction, so they need clear information about each delivery including customer contact details and accurate addresses. They take pride in their work and appreciate having the tools to do their job well, including easy access to navigation and the ability to document delivery completion professionally.

### Executive persona

Executives are senior managers who oversee pharmacy operations at a strategic level. They need high-level visibility into delivery performance metrics, trends over time, and comparative analysis across warehouses and drivers. Executives access the system occasionally rather than daily, primarily to review reports and dashboards for strategic planning and performance management. They require read-only access and prefer visual representations of data such as charts and summary statistics rather than detailed operational views. Executives use the system to identify opportunities for process improvement, resource allocation decisions, and to ensure service level standards are being met.

### Role-based access

The system implements four distinct permission levels to ensure appropriate access control. Super administrators have full system access including user management, configuration settings, order management across all warehouses, driver assignment and reassignment, access to all reports and analytics, and the ability to clear payment collections. Warehouse managers have access limited to their assigned pharmacy location, can view and assign orders for their warehouse, manage drivers assigned to their location, and access reports filtered to their warehouse. Dispatchers have cross-warehouse visibility for order assignment and tracking, can assign and reassign orders across all locations, view all driver statuses and locations, and access operational reports, but cannot manage users or system settings. Executives have read-only access to all dashboards, reports, and analytics across the entire system, but cannot make any operational changes or assignments.

## Functional requirements

### High priority requirements

The web dashboard must support Excel file upload for importing orders with columns for sales order number, created date and time, customer account, customer name, customer phone, customer address, total amount, and warehouse code. The import process must detect and flag duplicate sales order numbers while still importing the data. The dashboard must display all orders with filtering and search capabilities by warehouse, driver, date range, order status, and sales order number. Managers must be able to assign single or multiple orders to a driver through batch assignment, and reassign orders between drivers as needed. The system must track comprehensive order status including unassigned, assigned, received, picked up, on the way, delivered, and rejected. Real-time driver location must be displayed on a map interface along with warehouse locations. The mobile application must display all assigned orders for a driver with complete details including customer name, phone, address, payment method, and order amount. Drivers must be able to update order status, access integrated navigation to customer locations, capture proof of delivery via signature or photo, and reject orders with free-text reason. The system must send push notifications to drivers for new assignments and to managers for order rejections and driver status changes. Both web and mobile applications must support offline functionality with automatic data synchronization when connectivity is restored.

### Medium priority requirements

The dashboard must provide comprehensive analytics and reporting including deliveries per driver by time period, average delivery time, success versus failed delivery rate, driver performance comparison, and orders by warehouse. User management functionality must allow managers to create and manage driver accounts with fields for biometric ID, Phinex code, vehicle information, name, contact number, and assigned location. Manager account management must support role assignment for super admin, warehouse manager, dispatcher, and executive roles. The system must track payment status for orders and allow managers to clear collected amounts for cash on delivery, Knet, and MyFatoora payments. Order history must be maintained with full audit trail of status changes, driver assignments, and delivery attempts. The mobile application must allow drivers to toggle their availability status between online, offline, and busy. Drivers must be able to view their delivery history and performance metrics. The system must maintain data for two years with appropriate archiving mechanisms.

### Low priority requirements

The web dashboard should provide bilingual support with English as the primary language and Arabic as a secondary option. The mobile application should similarly support both English and Arabic interfaces. The system should provide exportable reports in common formats such as PDF and Excel. Advanced filtering options should allow managers to create custom views and save filter preferences. The dashboard should display summary statistics and key performance indicators on the home screen for quick operational overview.

## User experience

### Entry points

Managers access PharmaFleet through a web browser by navigating to the application URL and logging in with their username and password. Upon successful authentication, they are directed to a dashboard that displays current order status, active drivers, and key metrics. The primary navigation menu provides access to order management, driver management, analytics and reports, and user settings. Drivers download the PharmaFleet mobile application from the Google Play Store or through enterprise distribution, then log in using their assigned username and password. After login, drivers see their current assigned orders and can toggle their availability status. The mobile interface is optimized for single-handed use while on the go, with large touch targets and minimal navigation depth.

### Core experience

The manager workflow begins with importing orders by clicking an upload button and selecting the Excel file exported from Dynamics 365. The system processes the file, validates the data, flags any duplicates, and displays the imported orders in a table view. Managers can filter the order list by warehouse, status, or date, and search for specific orders. To assign orders, managers select one or multiple orders using checkboxes, click an assign button, and choose a driver from a list showing current availability status and location. Upon assignment, the system updates order status and sends a push notification to the driver. Managers monitor progress on a map view showing driver locations and can click on drivers or orders to see detailed information. If an order is rejected or needs reassignment, managers receive a notification and can quickly reassign with a few clicks. The analytics section provides visual charts and tables summarizing delivery performance, with options to filter by date range, warehouse, or driver.

The driver workflow starts when they open the app and set their status to online, making themselves available for assignments. When a new order is assigned, they receive a push notification and the order appears in their active orders list. Tapping an order shows full details including customer information, delivery address, payment method, and order value. The driver marks the order as received when they pick it up from the pharmacy, then taps a navigation button that opens Google Maps with the customer address. Upon arrival, they mark the order as on the way, then communicate with the customer if needed using the phone number provided. To complete delivery, they select the delivered status and choose either signature or photo as proof of delivery. The app captures the proof and uploads it when connectivity is available. If delivery fails, the driver selects reject, enters a free-text reason, and the order is returned to unassigned status with a notification to managers. For orders requiring payment collection, drivers confirm the payment method used and the amount collected, which flags the order for manager verification on the dashboard.

### Advanced features

The system supports complex scenarios such as drivers going offline while having assigned orders, which triggers notifications to managers who can then reassign as needed. Batch assignment allows managers to select multiple orders and assign them all to one driver in a single action, particularly useful for orders from the same warehouse or geographic area. The offline mode ensures that drivers can continue to update order status and capture delivery proof even without internet connectivity, with all changes queuing for synchronization once connection is restored. The payment tracking feature allows managers to see which orders have collected payments pending verification, and mark them as cleared once the driver returns and submits the cash or confirms electronic payment. Historical tracking enables managers to view the complete lifecycle of any order including all status changes, assigned drivers, rejection reasons, and delivery attempts over time.

### UI and UX highlights

The web dashboard uses a clean, modern interface with a prominent map view as the central element, showing real-time driver locations and warehouse markers. Color coding distinguishes order status at a glance: grey for unassigned, blue for assigned, yellow for in progress, green for delivered, and red for rejected. The interface is responsive and works on various screen sizes, though optimized for desktop use. Data tables include inline actions for quick operations without navigating away from the list view. The mobile application follows Material Design principles for Android, ensuring familiar patterns and gestures. Large, high-contrast buttons make it easy for drivers to update status while on the go. The order detail screen presents information in a logical flow matching the delivery process: customer contact information at the top, address with navigation button prominently displayed, and payment information clearly highlighted if collection is required. The proof of delivery screen provides clear instructions and preview of captured signatures or photos. Notifications are unobtrusive but attention-grabbing, using Android notification channels appropriately.

## Narrative

A pharmacy dispatcher starts their morning by logging into PharmaFleet and importing the first batch of delivery orders exported from Dynamics 365. The system quickly processes 50 orders across 8 warehouse locations, flagging 2 duplicates that the dispatcher verifies and dismisses. Looking at the map view, they see 15 drivers online and ready for assignments across Kuwait. The dispatcher filters orders by DW004 warehouse and selects 6 orders in the same general area, batch assigning them to a driver who is currently near that warehouse. The driver, who has just finished their morning coffee, receives a notification on their phone showing they have 6 new deliveries. They open PharmaFleet, review all the orders, and mark their status as busy before heading into the pharmacy to collect the first order. After picking up the medications, they mark the order as received and tap the navigation button, which opens Google Maps with turn-by-turn directions to the customer. Upon arrival at the first address, they call the customer using the phone number in the app, deliver the medication, capture the customer's signature as proof of delivery, and mark the order complete. This process repeats smoothly for the next 4 deliveries. However, at the 6th address, no one answers the door despite multiple attempts. The driver selects reject order, types "Customer not available, no answer after multiple attempts and phone calls," and submits. Back at the office, the dispatcher receives an instant notification about the rejected order, reviews the reason, and reassigns it to another driver who will be in that area later in the afternoon. Throughout the day, managers monitor the real-time map, watching as drivers move across the city and orders transition from assigned to delivered. By end of day, the executive team reviews the analytics dashboard showing 287 successful deliveries with a 94% success rate, average delivery time of 32 minutes, and identifies their top performing drivers across the pharmacy network.

## Success metrics

### User-centric metrics

Driver satisfaction will be measured through informal feedback and observation of app usage patterns, with success defined as drivers consistently using the app for all deliveries without reverting to manual processes. Order completion rate should reach at least 90% for assigned orders, indicating that drivers are successfully finding customers and completing deliveries. The average number of delivery attempts before success should decrease as drivers have better information, with a target of 1.2 attempts or fewer per order. Manager time spent on coordination should decrease significantly, measured through before-and-after time studies, with a target reduction of 50% in time spent making phone calls and tracking order status manually. Driver utilization should increase as managers can more easily identify available drivers and balance workload, with a target of reducing idle time by 30%.

### Business metrics

The primary business metric is total orders delivered per day, which should increase as efficiency improves, with a baseline of 300+ orders per day and a target of handling growth to 400+ orders within 3 months. Delivery time from order assignment to completion should decrease by at least 20% compared to the current manual process, with an initial target average of 35 minutes. Failed delivery rate should decrease from current levels as drivers have better customer information and navigation support, with a target below 10%. The system should support the projected growth of the pharmacy group over 2-3 months without performance degradation. Payment collection accuracy should improve with digital tracking, targeting 100% reconciliation of collected amounts versus order values for cash transactions. Cost per delivery should remain stable or decrease despite growth, as improved efficiency offsets additional volume.

### Technical metrics

System uptime should be 99.5% or higher during business hours, measured monthly. Data synchronization from offline mode should complete within 2 minutes of connectivity restoration for standard delivery volumes. The mobile application should load and display assigned orders within 2 seconds on typical Android devices with moderate connectivity. The web dashboard should handle concurrent access from 20+ managers without performance degradation, with page load times under 3 seconds. Map refresh rates should provide driver location updates every 30 seconds when drivers are online. Excel import processing should handle files with up to 500 orders within 30 seconds. The system should maintain data integrity with zero data loss during offline operations and synchronization. Push notifications should be delivered within 10 seconds of trigger events when devices have connectivity.

## Technical considerations

### Integration points

The system does not require direct integration with Microsoft Dynamics 365 CRM, as the order export process will remain a manual Excel-based workflow. However, the Excel import functionality must be robust enough to handle variations in file format and data quality. The mobile application integrates with Google Maps for navigation by constructing location URLs and launching the Maps application using Android intents. Push notifications utilize Firebase Cloud Messaging for Android devices, requiring proper configuration of notification channels and handling of notification permissions. The system requires integration with a location services provider to track driver locations in real-time, either using native Android location APIs or a third-party service. Authentication and session management must be implemented securely for both web and mobile platforms. The offline synchronization mechanism requires a robust queue-based architecture that can handle conflicts and ensure eventual consistency when drivers reconnect.

### Data storage and privacy

The system stores personally identifiable information including customer names, phone numbers, and addresses, as well as driver personal information, which must be protected according to Kuwait data protection requirements. Database design must support efficient querying for the map view and analytics while maintaining data integrity across the order lifecycle. Order data must be retained for 2 years for historical reporting and compliance purposes, requiring an archival strategy for older data. Payment information, particularly for cash on delivery transactions, must be tracked accurately for reconciliation purposes. Driver location data should be stored only when drivers are on active duty, with appropriate retention policies. The system must implement proper access controls to ensure that warehouse managers can only access data for their assigned locations, while dispatchers and super administrators have broader access. Regular database backups must be performed with encryption of sensitive data both at rest and in transit. Audit logs should track all critical operations including order assignments, status changes, and payment clearances for accountability and troubleshooting.

### Scalability and performance

The system must scale to support 102 current drivers with anticipated growth over the coming months. Order volume of 300+ per day will increase as the business grows, requiring the architecture to handle peak loads during busy periods. The database must efficiently handle queries across 14 warehouse locations with complex filtering and aggregation for analytics. Real-time map updates for 100+ concurrent drivers require optimization to prevent performance degradation. The mobile application must perform well on mid-range Android devices that drivers may use, with efficient battery usage for all-day operation. Offline data storage on mobile devices must be managed carefully to prevent excessive storage consumption while ensuring drivers have access to necessary order information. The web dashboard must support concurrent access from 20-30 managers during peak times without slowdown. File upload and processing for Excel imports must handle files containing several hundred orders efficiently. The analytics and reporting system must aggregate data across thousands of historical orders without causing timeouts or performance issues.

### Potential challenges

Data quality in the Excel imports presents a significant challenge, as customer addresses may be incomplete, inconsistent, or in mixed languages (English and Arabic), requiring the system to gracefully handle missing or malformed data. Offline synchronization conflicts may occur if multiple changes are made to the same order while drivers are offline, requiring clear conflict resolution strategies. Driver location accuracy depends on GPS signal quality and device capabilities, which may vary across Kuwait, particularly in areas with tall buildings or poor satellite visibility. Ensuring drivers remember to update order status at each step of the delivery process requires careful UX design and potentially reminder notifications. Managing the transition from the current manual process to the new system requires comprehensive training for both managers and drivers, as well as a period of parallel operation to build confidence. Battery consumption on driver devices is a concern given the need for continuous location tracking and the possibility of drivers working long shifts. Network connectivity is inconsistent across Kuwait, particularly in certain areas, making robust offline functionality critical to system success. The manual assignment process may become a bottleneck as order volumes grow, potentially requiring future consideration of assignment assistance or automation features despite the current preference for manual control.

## Milestones and sequencing

### Project estimate

The PharmaFleet project is estimated to require approximately 4-5 months for complete development, testing, and deployment. This includes backend development for 6-8 weeks, web dashboard development for 6-8 weeks (partially parallel with backend), Android mobile application development for 8-10 weeks (partially parallel with backend and dashboard), integration and system testing for 3-4 weeks, user acceptance testing and training for 2-3 weeks, and deployment and stabilization for 1-2 weeks. These estimates assume a dedicated development team and may be adjusted based on resource availability and competing priorities.

### Team size

The recommended team composition includes one backend developer with expertise in Python and API development, one frontend web developer proficient in modern JavaScript frameworks for the dashboard, one mobile developer experienced with Flutter for Android development, one UI/UX designer to create interfaces and user flows for both web and mobile applications, one QA engineer to develop test plans and execute comprehensive testing, and one project manager to coordinate activities and manage stakeholder communication. Additionally, a DevOps engineer should be available part-time for infrastructure setup and deployment configuration.

### Suggested phases

Phase one focuses on core order management and assignment functionality. This includes backend API development for order management, user authentication, and driver tracking; web dashboard development for Excel import, order listing, filtering, and single order assignment; basic driver management and role-based access control; and mobile application development for viewing assigned orders and updating status. This phase establishes the foundation of the system and enables basic manual workflow.

Phase two adds real-time tracking and advanced assignment features. This includes real-time driver location tracking and map display on the dashboard; batch assignment functionality for multiple orders; push notification implementation for drivers and managers; order reassignment and rejection handling; and proof of delivery capture with signature and photo options. This phase brings the system to near-full functionality for daily operations.

Phase three implements offline capabilities and payment tracking. This includes offline mode for the mobile application with synchronization; payment status tracking and collection clearance workflow; comprehensive analytics and reporting dashboard; driver availability status management (online, offline, busy); and bilingual interface support for English and Arabic. This phase completes all core requirements.

Phase four encompasses testing, deployment, and training. This includes comprehensive system integration testing; user acceptance testing with managers and drivers; performance and load testing; security testing and vulnerability assessment; user training for managers and drivers; documentation creation; production deployment; and monitoring and support during initial rollout. This phase ensures the system is production-ready and users are prepared for adoption.

## User stories

### Authentication and user management

**US-001: Manager login**  
As a manager, I want to log in to the web dashboard using my username and password so that I can access the system securely.  
Acceptance criteria:
- Login page accepts username and password
- System validates credentials against user database
- Successful login redirects to dashboard home page
- Failed login displays appropriate error message
- Session is maintained across page navigation
- Logout functionality is available from any page

**US-002: Driver login**  
As a driver, I want to log in to the mobile application using my username and password so that I can access my delivery assignments.  
Acceptance criteria:
- Login screen accepts username and password input
- System authenticates credentials
- Successful login shows list of assigned orders
- Failed login displays error message
- Remember me option keeps driver logged in
- Logout option is available in settings menu

**US-003: Create driver account**  
As a super admin, I want to create new driver accounts so that drivers can access the mobile application.  
Acceptance criteria:
- Driver management interface allows creation of new driver
- Form captures biometric ID, Phinex code, vehicle information, name, contact number, and assigned location
- System validates required fields
- Username is generated or assigned uniquely
- Temporary password is created and can be sent to driver
- New driver appears in driver list immediately
- Driver can log in with provided credentials

**US-004: Manage manager accounts**  
As a super admin, I want to create and manage manager accounts with different roles so that appropriate access controls are enforced.  
Acceptance criteria:
- User management interface shows all manager accounts
- Create manager form captures username, password, role (super admin, warehouse manager, dispatcher, executive), and assigned warehouse (if applicable)
- System enforces role-based access control
- Warehouse managers are restricted to their assigned warehouse
- Executives have read-only access across all data
- Accounts can be edited or deactivated
- Password reset functionality is available

**US-005: Update driver information**  
As a super admin or warehouse manager, I want to update driver details so that information remains current.  
Acceptance criteria:
- Driver profile can be accessed from driver list
- All driver fields are editable except username
- Changes are saved and reflected immediately
- Vehicle information and assigned location can be updated
- Contact number updates are validated for format
- Change history is logged for audit purposes

### Order import and management

**US-006: Import orders from Excel**  
As a manager, I want to upload an Excel file containing orders so that I can import multiple orders at once.  
Acceptance criteria:
- Upload button is prominently displayed on order management page
- File selection dialog accepts Excel files (.xlsx, .xls)
- System processes file and validates required columns
- Orders are parsed and displayed in preview before final import
- Import progress indicator shows during processing
- Successfully imported orders appear in order list
- Import summary shows number of orders imported

**US-007: Detect duplicate orders**  
As a manager, I want the system to flag duplicate sales order numbers during import so that I can identify and handle them appropriately.  
Acceptance criteria:
- System checks sales order numbers against existing orders during import
- Duplicate orders are flagged with visual indicator (color, icon)
- Duplicate orders are still imported into the system
- Manager can view which orders are duplicates
- Flagged duplicates can be dismissed or deleted after review
- Import summary indicates number of duplicates found

**US-008: View order list**  
As a manager, I want to view all orders in a table so that I can see current order status and details.  
Acceptance criteria:
- Order list displays all imported orders
- Table shows sales order number, customer name, phone, address, warehouse, amount, status, and assigned driver
- Orders are sorted by creation date by default (newest first)
- Pagination is available for large order lists
- Order status is clearly indicated with color coding
- Clicking an order shows full details in expanded view or modal

**US-009: Filter orders**  
As a manager, I want to filter the order list by various criteria so that I can find specific orders quickly.  
Acceptance criteria:
- Filter panel is available on order management page
- Filters include warehouse, driver, date range, order status
- Multiple filters can be applied simultaneously
- Filter results update order list in real-time
- Active filters are clearly displayed
- Clear filters button resets all filters
- Filter state persists during session

**US-010: Search for orders**  
As a manager, I want to search for specific orders so that I can quickly locate an order.  
Acceptance criteria:
- Search box is prominently displayed above order list
- Search works across sales order number, customer name, and customer phone
- Results update as user types (with debounce)
- Partial matches are returned
- Search can be combined with filters
- Clear search button removes search query
- No results message is displayed when appropriate

**US-011: View order details**  
As a manager, I want to view complete details of an order so that I can understand all information about a delivery.  
Acceptance criteria:
- Order detail view shows all fields from Excel import
- Additional system fields are displayed (status, assigned driver, status history)
- Customer information is clearly presented
- Payment method and amount are highlighted
- Warehouse source is shown
- Status change history is visible with timestamps
- Navigation back to order list is available

### Order assignment

**US-012: Assign single order to driver**  
As a manager, I want to assign an order to a driver so that the driver receives the delivery assignment.  
Acceptance criteria:
- Assign action is available for unassigned orders
- Driver selection shows list of all drivers
- Driver list indicates current availability status (online, offline, busy)
- Driver location is shown on map or in list
- Selected driver is assigned to order
- Order status changes to "Assigned"
- Push notification is sent to driver's mobile device
- Order appears in driver's mobile app immediately

**US-013: Batch assign multiple orders**  
As a manager, I want to assign multiple orders to one driver at once so that I can efficiently distribute orders.  
Acceptance criteria:
- Multiple orders can be selected using checkboxes
- Batch assign button is available when orders are selected
- Driver selection interface shows for batch assignment
- All selected orders are assigned to chosen driver
- All orders update status to "Assigned"
- Single push notification is sent to driver indicating multiple new assignments
- All orders appear in driver's app
- Batch assignment is logged in system

**US-014: Reassign order to different driver**  
As a manager, I want to reassign an order from one driver to another so that I can adjust assignments as needed.  
Acceptance criteria:
- Reassign action is available for assigned orders
- Current driver is shown in reassignment interface
- New driver can be selected from driver list
- Order is removed from original driver's app
- Order is added to new driver's app
- Push notifications sent to both drivers
- Reassignment is logged with reason and timestamp
- Order status history reflects reassignment

**US-015: Unassign order**  
As a manager, I want to unassign an order from a driver so that it returns to the unassigned pool.  
Acceptance criteria:
- Unassign action is available for assigned orders
- Confirmation dialog prevents accidental unassignment
- Order status changes to "Unassigned"
- Order is removed from driver's mobile app
- Driver receives notification of unassignment
- Unassignment is logged in order history
- Order appears in unassigned order list for managers

### Driver tracking and map view

**US-016: View driver locations on map**  
As a manager, I want to see real-time driver locations on a map so that I can understand driver distribution across Kuwait.  
Acceptance criteria:
- Map view is available on dashboard
- All online drivers are shown as markers on map
- Driver markers update every 30 seconds
- Clicking driver marker shows driver name and current status
- Map can be zoomed and panned
- Driver markers are color-coded by status (available, busy, offline)
- Map centers on Kuwait with appropriate initial zoom level

**US-017: View warehouse locations on map**  
As a manager, I want to see pharmacy warehouse locations on the map so that I can understand the geographic distribution of pharmacies.  
Acceptance criteria:
- All 14 warehouse locations are shown as markers on map
- Warehouse markers are visually distinct from driver markers
- Clicking warehouse marker shows pharmacy name and code
- Warehouse markers are always visible regardless of zoom level
- Warehouse locations are accurately placed on map

**US-018: Track driver location from mobile app**  
As a driver, I want my location to be shared with managers when I am online so that they can track deliveries.  
Acceptance criteria:
- Location tracking begins when driver sets status to online
- Location updates are sent every 30 seconds while online
- Location tracking stops when driver goes offline
- Battery usage is optimized for all-day tracking
- Location permission is requested on first app launch
- Driver can see their own location accuracy status in app

**US-019: View driver status**  
As a manager, I want to see each driver's current availability status so that I know who is available for assignments.  
Acceptance criteria:
- Driver list shows current status for each driver (online, offline, busy)
- Status is updated in real-time when drivers change it
- Status is color-coded for quick scanning
- Number of assigned active orders is shown for each driver
- Last location update timestamp is displayed
- Drivers can be filtered by status

### Mobile app - Order management

**US-020: View assigned orders**  
As a driver, I want to see all my assigned orders in the mobile app so that I know what deliveries I need to make.  
Acceptance criteria:
- All assigned orders are displayed in a list on main screen
- Each order shows customer name, address preview, and order amount
- Orders are sorted by assignment time (newest first)
- Status of each order is clearly indicated
- Tapping an order opens full detail view
- Empty state message is shown when no orders are assigned
- List refreshes when new orders are assigned

**US-021: View order details in mobile app**  
As a driver, I want to view complete details of an order so that I have all information needed for delivery.  
Acceptance criteria:
- Order detail screen shows sales order number
- Customer name, phone number, and full address are displayed
- Payment method is clearly indicated (prepaid, COD, Knet, MyFatoora)
- Order amount is shown
- Warehouse source is displayed
- Current order status is shown
- Navigation and action buttons are prominently placed

**US-022: Mark order as received**  
As a driver, I want to mark an order as received when I pick it up from the pharmacy so that the status is updated.  
Acceptance criteria:
- Received button is available for assigned orders
- Tapping received changes order status to "Received"
- Status update is sent to server immediately if online
- Status update is queued if offline
- Order status is updated in manager dashboard
- Timestamp of status change is recorded
- Visual confirmation is shown to driver

**US-023: Mark order as picked up**  
As a driver, I want to mark an order as picked up when I collect it so that progress is tracked.  
Acceptance criteria:
- Picked up button is available for received orders
- Tapping picked up changes status to "Picked Up"
- Status synchronizes with server
- Manager dashboard reflects updated status
- Order remains in active orders list
- Timestamp is recorded

**US-024: Mark order as on the way**  
As a driver, I want to indicate when I am en route to the customer so that status is current.  
Acceptance criteria:
- On the way button is available after pickup
- Tapping updates status to "On the Way"
- Status is synchronized with backend
- Manager sees updated status in real-time
- Order detail shows on the way status
- Timestamp is recorded for analytics

**US-025: Navigate to customer address**  
As a driver, I want to open navigation to the customer address so that I can find the delivery location.  
Acceptance criteria:
- Navigate button is prominently displayed on order detail screen
- Tapping navigate button opens Google Maps application
- Customer address is passed to Google Maps correctly
- If Google Maps is not installed, appropriate error message is shown
- Navigation returns to PharmaFleet app when completed
- Address is formatted correctly for Google Maps API

**US-026: Complete delivery**  
As a driver, I want to mark an order as delivered when I successfully hand it to the customer so that the order is closed.  
Acceptance criteria:
- Deliver button is available when order is on the way
- Tapping deliver initiates proof of delivery capture
- After proof is captured, order status changes to "Delivered"
- Delivered orders move to completed section
- Status is synchronized with server
- Manager dashboard shows order as completed
- Delivery timestamp is recorded

**US-027: Reject order**  
As a driver, I want to reject an order if I cannot complete the delivery so that it can be reassigned.  
Acceptance criteria:
- Reject option is available for any assigned order
- Tapping reject opens text input for reason
- Free-form text allows driver to explain rejection
- Confirmation dialog prevents accidental rejection
- Order status reverts to "Unassigned"
- Order is removed from driver's assigned list
- Manager receives push notification with rejection reason
- Rejection is logged in order history

### Proof of delivery

**US-028: Capture signature as proof**  
As a driver, I want to capture customer signature as proof of delivery so that delivery is documented.  
Acceptance criteria:
- Signature capture screen is shown after selecting deliver
- Touch screen allows customer to sign with finger or stylus
- Clear button allows customer to redo signature
- Done button confirms and saves signature
- Signature is saved as image file
- Signature uploads to server when connectivity available
- Signature is viewable by managers in order history

**US-029: Capture photo as proof**  
As a driver, I want to take a photo as proof of delivery so that I have visual confirmation.  
Acceptance criteria:
- Photo option is available as alternative to signature
- Camera opens when photo option is selected
- Driver can capture photo of delivered order or receipt
- Photo can be retaken if needed
- Confirm button saves photo
- Photo uploads to server when online
- Photo is viewable by managers in order history

**US-030: View proof of delivery**  
As a manager, I want to view proof of delivery for completed orders so that I can verify completion.  
Acceptance criteria:
- Proof of delivery is accessible from order detail view
- Signature images are displayed clearly
- Photos are displayed with zoom capability
- Timestamp of proof capture is shown
- Driver who completed delivery is indicated
- Proof can be downloaded or printed if needed

### Driver availability management

**US-031: Set driver status to online**  
As a driver, I want to set my status to online so that I can receive order assignments.  
Acceptance criteria:
- Status toggle is prominently displayed on main screen
- Tapping toggle changes status to online
- Status change is sent to server immediately
- Driver appears as available in manager dashboard
- Location tracking begins automatically
- Driver can receive push notifications for new assignments

**US-032: Set driver status to offline**  
As a driver, I want to set my status to offline when I am not available so that I don't receive assignments.  
Acceptance criteria:
- Offline option is available in status toggle
- Tapping offline changes status
- Status change is synchronized with server
- Driver appears as offline in manager dashboard
- Location tracking stops
- Driver does not receive new assignment notifications
- Confirmation prompt if driver has active orders

**US-033: Set driver status to busy**  
As a driver, I want to set my status to busy when I cannot take more orders so that I am not assigned additional work.  
Acceptance criteria:
- Busy option is available in status toggle
- Tapping busy updates status
- Status is shown to managers as busy
- Driver can still complete existing assigned orders
- Driver does not receive new assignments while busy
- Location tracking continues while busy
- Driver can change back to online when ready

**US-034: Handle driver going offline with assigned orders**  
As a manager, I want to be notified when a driver goes offline while having assigned orders so that I can take action.  
Acceptance criteria:
- System detects when driver with active orders goes offline
- Push notification is sent to managers
- Notification indicates driver name and number of active orders
- Manager can view affected orders in dashboard
- Manager can reassign orders to other drivers
- Affected orders are highlighted in order list

### Payment management

**US-035: Track order payment status**  
As a manager, I want to see payment status for each order so that I can track collections.  
Acceptance criteria:
- Payment status is displayed in order list and detail view
- Status indicates prepaid, collected (COD), collected (Knet), collected (MyFatoora), or pending collection
- Orders requiring collection are visually distinguished
- Payment method from Excel import is preserved
- Payment status can be filtered in order list
- Total pending collections amount is calculated

**US-036: Mark payment as collected**  
As a driver, I want to indicate that payment was collected so that managers know the financial status.  
Acceptance criteria:
- Payment collection option is available during delivery completion
- Driver selects payment method used (COD, Knet, MyFatoora)
- For COD, driver confirms amount collected
- Payment collection is recorded with timestamp
- Order is flagged for manager verification
- Payment status is updated in dashboard

**US-037: Clear collected payment**  
As a manager, I want to clear collected payments after verifying driver submission so that accounting is accurate.  
Acceptance criteria:
- Orders with collected payments are shown in pending verification list
- Manager can view collection details (amount, method, driver, timestamp)
- Clear payment button marks payment as verified
- Cleared payments are removed from pending list
- Cleared payments are included in financial reports
- Clearance action is logged with manager identity

**US-038: View payment collection report**  
As a manager, I want to view reports of payment collections so that I can reconcile with driver submissions.  
Acceptance criteria:
- Payment report is available in analytics section
- Report shows collections by driver, date range, payment method
- Total collected amounts are calculated
- Pending versus cleared payments are distinguished
- Report can be filtered by driver, date, warehouse
- Report can be exported for accounting purposes

### Notifications

**US-039: Receive new assignment notification**  
As a driver, I want to receive a push notification when orders are assigned to me so that I am immediately aware.  
Acceptance criteria:
- Push notification is sent when order is assigned
- Notification shows number of new orders assigned
- Tapping notification opens mobile app to order list
- Notification sound and vibration alert driver
- Notification appears even when app is closed
- Multiple assignments in quick succession are batched into single notification

**US-040: Receive order rejection notification**  
As a manager, I want to be notified when a driver rejects an order so that I can reassign it quickly.  
Acceptance criteria:
- Push notification is sent when driver rejects order
- Notification shows order number and driver name
- Rejection reason is included in notification
- Tapping notification opens dashboard to order detail
- Notification is sent to all dispatchers and super admins
- Warehouse managers receive notifications only for their warehouse

**US-041: Receive driver offline notification**  
As a manager, I want to be notified when a driver with active orders goes offline so that I can manage the situation.  
Acceptance criteria:
- Notification is sent when driver changes status to offline while having assigned orders
- Notification shows driver name and count of affected orders
- Tapping notification shows list of affected orders
- Notification includes last known driver location
- Manager can quickly access reassignment functionality

**US-042: Receive order status update notification**  
As a manager, I want to receive notifications for key order status changes so that I can monitor delivery progress.  
Acceptance criteria:
- Notifications can be configured by manager preferences
- Status changes that trigger notifications include picked up, delivered, and failed
- Notification shows order number and new status
- High-value orders can be flagged for mandatory notifications
- Notification frequency can be adjusted to prevent overwhelming managers

### Analytics and reporting

**US-043: View deliveries per driver report**  
As a manager, I want to see how many deliveries each driver completes so that I can evaluate performance.  
Acceptance criteria:
- Report shows deliveries per driver for selected time period
- Time periods include today, this week, this month, custom date range
- Report displays driver name, total deliveries, successful deliveries, failed deliveries
- Success rate percentage is calculated
- Report can be sorted by any column
- Report can be exported to Excel or PDF

**US-044: View average delivery time report**  
As a manager, I want to see average delivery times so that I can identify efficiency opportunities.  
Acceptance criteria:
- Report calculates average time from assignment to delivery
- Average is shown overall and per driver
- Time periods can be selected
- Report identifies fastest and slowest deliveries
- Trend over time is visualized in chart
- Outliers are identified for investigation

**US-045: View success versus failed delivery rate**  
As a manager, I want to see what percentage of deliveries succeed so that I can track service quality.  
Acceptance criteria:
- Report shows total deliveries, successful deliveries, failed deliveries
- Success rate percentage is prominently displayed
- Failed deliveries are categorized by rejection reason
- Report can be filtered by driver, warehouse, date range
- Trend over time shows if success rate is improving or declining
- Common failure reasons are identified

**US-046: View driver performance comparison**  
As a manager, I want to compare driver performance so that I can identify top performers and coaching opportunities.  
Acceptance criteria:
- Report shows all drivers side by side
- Metrics include total deliveries, success rate, average delivery time
- Drivers can be ranked by any metric
- Visual indicators show top, average, and below-average performers
- Report respects role-based access (warehouse managers see only their drivers)
- Report can be exported for performance reviews

**US-047: View orders by warehouse report**  
As a manager, I want to see order volumes by warehouse so that I can understand demand distribution.  
Acceptance criteria:
- Report shows total orders per warehouse for selected period
- Chart visualizes distribution across all warehouses
- Report includes delivered, pending, and failed orders per warehouse
- Trends over time show growth or decline per location
- Report helps identify warehouses needing more drivers
- Export functionality is available

**US-048: View executive dashboard**  
As an executive, I want to see high-level KPIs so that I can monitor overall performance at a glance.  
Acceptance criteria:
- Dashboard shows total orders today, this week, this month
- Overall success rate is prominently displayed
- Average delivery time is shown
- Number of active drivers is indicated
- Top performing drivers are highlighted
- Trend charts show performance over time
- Dashboard auto-refreshes every few minutes

### Offline functionality

**US-049: View orders while offline**  
As a driver, I want to view my assigned orders even without internet connectivity so that I can continue working.  
Acceptance criteria:
- Orders assigned while online are cached locally
- Order details are fully accessible offline
- Customer information, addresses, and payment details are available
- Orders remain viewable until driver reconnects and syncs
- No functionality is lost for viewing existing assignments

**US-050: Update order status while offline**  
As a driver, I want to update order status even when offline so that connectivity issues don't block my work.  
Acceptance criteria:
- All status update buttons work offline
- Status changes are queued locally
- Visual indicator shows that changes are pending sync
- Changes are automatically sent when connectivity is restored
- No data is lost during offline operation
- Sync conflicts are handled gracefully

**US-051: Capture proof of delivery while offline**  
As a driver, I want to capture signatures and photos offline so that poor connectivity doesn't prevent delivery completion.  
Acceptance criteria:
- Signature capture works without internet connection
- Photos can be taken and saved locally offline
- Proof of delivery is queued for upload
- Visual indicator shows pending uploads
- Uploads occur automatically when connectivity returns
- Large photos are compressed for efficient upload

**US-052: Synchronize data when reconnecting**  
As a driver, I want my offline changes to sync automatically when I regain connectivity so that the system stays current.  
Acceptance criteria:
- Sync begins automatically when connectivity is detected
- Pending status updates are sent first
- Proof of delivery files are uploaded next
- Sync progress is shown to driver
- Sync completes in background if driver continues working
- Conflicts are resolved using last-write-wins strategy
- Sync completion notification is shown

### Bilingual support

**US-053: Switch dashboard language**  
As a manager, I want to switch the dashboard language between English and Arabic so that I can use my preferred language.  
Acceptance criteria:
- Language selector is available in settings or user menu
- Switching language updates all interface text immediately
- Selected language is saved as user preference
- Language choice persists across sessions
- All dashboard sections support both languages
- Data values (customer names, addresses) are displayed as-is regardless of interface language

**US-054: Switch mobile app language**  
As a driver, I want to use the mobile app in Arabic or English so that I can work in my preferred language.  
Acceptance criteria:
- Language option is available in app settings
- Switching language updates all interface text
- Selected language is saved to device
- Language preference persists after app restarts
- All screens and buttons are translated
- Order data displays correctly in both languages

### Data handling and edge cases

**US-055: Handle missing customer address**  
As a driver, I want to see when address information is missing so that I can contact the customer for details.  
Acceptance criteria:
- Orders with null or empty addresses are clearly marked
- Missing address indicator is shown in order list and detail view
- Customer phone number is prominently displayed for these orders
- Driver can still mark order as received and picked up
- Navigation button is disabled or shows warning when address is missing
- Driver can add notes about obtaining address from customer

**US-056: Handle missing customer phone**  
As a driver, I want to know when phone number is missing so that I understand I cannot call the customer.  
Acceptance criteria:
- Orders with missing phone numbers are flagged
- Visual indicator shows that contact information is incomplete
- Call button is disabled when phone number is missing
- Driver can still attempt delivery using address alone
- Missing phone orders can be flagged for manager review

**US-057: Display mixed language addresses**  
As a driver, I want to see addresses in both English and Arabic so that I can navigate effectively.  
Acceptance criteria:
- Addresses are displayed exactly as imported from Excel
- Mixed English and Arabic text is rendered correctly
- Right-to-left text for Arabic is handled properly
- Addresses can be copied for pasting into navigation apps
- Font supports both English and Arabic characters clearly

**US-058: Handle orders with zero amount**  
As a manager, I want to see orders with zero or missing amounts so that I can investigate data issues.  
Acceptance criteria:
- Orders with zero or null amounts are flagged
- Visual indicator distinguishes these from normal orders
- These orders can still be assigned and delivered
- Payment collection is skipped for zero-amount orders
- Manager can review and correct amount if needed

**US-059: Validate Excel file format**  
As a manager, I want to be notified if the Excel file format is incorrect so that I can fix it before import.  
Acceptance criteria:
- System validates required columns before import
- Error message lists missing or misnamed columns
- Import is prevented if format is invalid
- Sample valid format is shown in error message
- Partially valid files offer option to import valid rows

**US-060: Handle concurrent order assignments**  
As a manager, I want the system to prevent conflicts when multiple managers assign orders simultaneously so that data integrity is maintained.  
Acceptance criteria:
- System locks orders during assignment process
- If order is assigned by another manager simultaneously, second manager receives notification
- Most recent assignment takes precedence
- Both assignments are logged for audit
- Manager can see who assigned order and when
- Reassignment is available if needed

**US-061: View order status history**  
As a manager, I want to see complete history of an order's status changes so that I can understand what happened.  
Acceptance criteria:
- Order detail page shows all status transitions
- Each status change includes timestamp and driver name
- Assignment and reassignment events are logged
- Rejection reasons are preserved in history
- Proof of delivery timestamp is included
- History can be exported for record keeping

**US-062: Export order data**  
As a manager, I want to export order data to Excel so that I can perform external analysis.  
Acceptance criteria:
- Export button is available on order list page
- Export includes all visible columns based on current filters
- Excel file contains all order details
- File name includes date range and timestamp
- Large exports are processed in background
- Download link is provided when export is ready

**US-063: View driver delivery history**  
As a manager, I want to see all deliveries completed by a specific driver so that I can review their work.  
Acceptance criteria:
- Driver profile page shows delivery history
- History includes all completed and failed deliveries
- Date range can be selected
- Each delivery shows order number, customer, status, and completion time
- Success rate for the period is calculated
- History can be exported

**US-064: Handle large batch imports**  
As a manager, I want to import files with hundreds of orders without performance degradation so that I can process peak volumes.  
Acceptance criteria:
- Import process handles at least 500 orders per file
- Progress indicator shows import status
- System remains responsive during import
- Import completes within 30 seconds for 500 orders
- Memory usage is optimized
- Large imports don't block other manager operations

**US-065: Recover from failed uploads**  
As a driver, I want the app to retry failed uploads automatically so that proof of delivery eventually reaches the server.  
Acceptance criteria:
- Failed uploads are detected and logged
- Retry occurs automatically when connectivity improves
- Exponential backoff prevents overwhelming network
- Maximum retry attempts are configured
- Manual retry option is available
- Persistent failures are flagged for manager attention

**US-066: Handle app updates**  
As a driver, I want to be notified of app updates so that I can stay current with new features and fixes.  
Acceptance criteria:
- App checks for updates on startup
- Update notification shows version and changes
- Driver can choose to update now or later
- Critical updates are mandatory before continuing
- Update download progresses in background
- App restarts after update installation

**US-067: Session timeout and security**  
As a manager, I want my session to timeout after inactivity so that unauthorized access is prevented.  
Acceptance criteria:
- Session expires after 30 minutes of inactivity on web dashboard
- Warning is shown 2 minutes before timeout
- User can extend session before timeout
- After timeout, login is required to continue
- Active work is saved before timeout when possible
- Mobile app sessions persist longer due to usage pattern

**US-068: Data retention and archival**  
As a super admin, I want old data to be archived automatically so that system performance remains optimal while preserving history.  
Acceptance criteria:
- Orders older than 2 years are moved to archive storage
- Archived data can be accessed through separate interface
- Archive process runs automatically on schedule
- Active database size is managed
- Archived data maintains full integrity
- Restoration from archive is possible if needed

**US-069: Audit trail for sensitive operations**  
As a super admin, I want to see audit logs of critical operations so that I can ensure accountability.  
Acceptance criteria:
- All user management operations are logged
- Payment clearances are logged with manager identity
- Order reassignments are logged
- Login attempts (successful and failed) are logged
- Audit log includes timestamp, user, action, and affected entity
- Audit logs cannot be modified or deleted
- Logs are retained for compliance period

**US-070: Handle order cancellations**  
As a manager, I want to cancel an order if it's no longer needed so that drivers don't attempt delivery.  
Acceptance criteria:
- Cancel option is available for unassigned and assigned orders
- Cancellation requires reason input
- Cancelled orders are removed from driver app
- Driver is notified if order was already assigned
- Cancelled orders appear in separate list
- Cancellation cannot be undone but is logged
- Cancelled orders are excluded from performance metrics