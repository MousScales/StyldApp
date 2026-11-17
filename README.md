# Styld — Business Management & Payment Platform

### Full-Stack Application Engineering | Financial Integrations | Cloud Infrastructure

**TypeScript · React Native · Supabase · PostgreSQL · Stripe · API Integration · Serverless Functions**

Styld is a mobile business management platform designed for independent beauty professionals to manage appointments, clients, payments, and business operations through a unified application.

Built with React Native, TypeScript, and Supabase, the platform combines customer management, scheduling, payment processing, and subscription services into a database-backed application.

**Website:** [styldd.com](https://styldd.com)

## Engineering Highlights

### 1. Payment Infrastructure & Financial Integrations

Styld incorporates multiple financial technology integrations to support business transactions and payment-related workflows.

- Integrated **Stripe** and **Stripe Terminal** SDKs for payment functionality.
- Developed backend workflows for Stripe Connect account status, synchronization, and payouts.
- Incorporated **RevenueCat** for subscription and in-app purchase management.
- Added **Plaid Link** integration for financial account connectivity.
- Organized payment functionality across mobile interfaces and backend services.

**Relevant concepts:** Payment Processing, Financial APIs, Transaction Workflows, Third-Party Integrations, Backend Systems

### 2. Backend Architecture & Database Management

The platform uses Supabase to provide backend infrastructure and data management.

- Integrated Supabase services into a React Native application.
- Organized database changes using migration and deployment workflows.
- Developed serverless Edge Functions for payment and subscription operations.
- Configured backend secrets and deployment scripts.
- Structured application services to separate backend communication from presentation logic.

**Relevant concepts:** PostgreSQL, Database Management, Serverless Architecture, API Design, Cloud Infrastructure

### 3. Authentication & Role-Based Navigation

Styld includes multiple application experiences depending on authentication state and account privileges.

- Implemented authentication-aware navigation.
- Separated authenticated and unauthenticated application flows.
- Developed distinct navigation for platform administrators.
- Organized shared application state using React Context providers.
- Integrated privacy and subscription state into application-level architecture.

**Relevant concepts:** Authentication, Authorization, Role-Based Access, State Management, Application Security

### 4. Software Architecture & Systems Integration

- Developed a modular mobile application using **React Native and TypeScript**.
- Integrated native SDKs for payments, subscriptions, and authentication.
- Used shared providers for authentication, purchases, and privacy settings.
- Separated navigation, application screens, services, and reusable interface components.
- Configured native iOS and Android development workflows using Expo.

**Relevant concepts:** Type Safety, Modular Architecture, Native SDK Integration, Software Maintainability, Cross-Platform Development

## Core Platform Features

| Feature | Engineering Focus |
|---|---|
| Appointment Scheduling | Calendar integration and scheduling workflows |
| Client Management | Customer information and business records |
| Payment Processing | Stripe and Stripe Terminal integrations |
| Connected Accounts | Stripe Connect and Plaid integrations |
| Subscription Management | RevenueCat and subscription backend functions |
| Business Administration | Administrative navigation and management interfaces |
| Authentication | Session management and access-controlled navigation |
| Cloud Backend | Supabase, PostgreSQL, and Edge Functions |

## Technology Stack

| Category | Technologies |
|---|---|
| Languages | TypeScript, JavaScript |
| Mobile Framework | React Native, Expo SDK 54 |
| Backend Platform | Supabase |
| Database | PostgreSQL |
| Serverless Computing | Supabase Edge Functions |
| Payments | Stripe, Stripe Connect, Stripe Terminal |
| Financial Connectivity | Plaid |
| Subscriptions | RevenueCat |
| Authentication | Supabase Auth, Apple Authentication |
| State Management | React Context API |
| Navigation | React Navigation |
| Native Development | Expo Development Client |
| Version Control | Git, GitHub |

## Project Architecture

```text
StyldApp/
├── App.tsx                  # Application entry and providers
├── index.ts                 # Entry point
├── src/
│   ├── context/             # Shared application state
│   ├── navigation/          # Authentication and role-based routing
│   ├── screens/             # Application screens
│   ├── lib/                 # Shared integration utilities
│   └── theme/               # Application design system
├── supabase/                # Backend configuration and functions
├── plugins/                 # Native integrations
├── scripts/                 # Development and deployment utilities
├── assets/                  # Application assets
├── docs/                    # Technical documentation
├── app.json                 # Expo configuration
├── eas.json                 # EAS build configuration
├── package.json             # Dependencies and scripts
└── tsconfig.json            # TypeScript configuration
```

## Getting Started

### Prerequisites

- Node.js and npm
- Expo development tooling
- Xcode or Android Studio for native builds
- Supabase project configuration
- Required credentials for external integrations

### 1. Clone the Repository

```bash
git clone https://github.com/MousScales/StyldApp.git
cd StyldApp
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Review `.env.example` and configure the environment variables required for Supabase and other integrations.

Keep API secrets, database credentials, and private payment keys outside version control.

### 4. Start Development

```bash
npm start
```

Run on iOS:

```bash
npm run ios
```

Run on Android:

```bash
npm run android
```

Styld uses the Expo development client. Native integrations may require a custom development build.

## Development & Deployment

| Command | Description |
|---|---|
| `npm start` | Start the Expo development client |
| `npm run ios` | Start iOS development |
| `npm run android` | Start Android development |
| `npm run native:ios` | Generate and run a native iOS build |
| `npm run native:android` | Generate and run a native Android build |
| `npm run db:push` | Apply linked Supabase database migrations |
| `npm run functions:deploy` | Deploy Supabase Edge Functions |
| `npm run functions:deploy:stripe` | Deploy Stripe-related backend functions |
| `npm run functions:deploy:revenuecat` | Deploy subscription-related backend functions |

Database and deployment commands require authorized project access and correctly configured credentials.

## Engineering Focus

Styld demonstrates practical experience in several areas relevant to financial technology and quantitative software development.

**Financial Systems Integration**

Working with payment processors, connected financial accounts, subscription services, and payout-related backend workflows.

**Backend & Database Engineering**

Managing structured application data, database migrations, cloud functions, and service integrations.

**State & Application Architecture**

Coordinating authentication, permissions, subscriptions, and business workflows across a complex mobile application.

**Type-Safe Development**

Using TypeScript to organize application logic and improve maintainability across interconnected components.

**Systems Thinking**

Integrating multiple external services into a cohesive application with distinct frontend, backend, and financial responsibilities.

While Styld is not a quantitative trading application, its backend and payment integrations provide relevant experience with the kinds of interconnected systems used in financial software engineering.

## About the Developer

**Moustapha Gueye**

Computer & Data Science Student at New York University | Aspiring Quantitative Developer

Interested in systems programming, financial technology, algorithms, and high-performance software development.

- **GitHub:** [@MousScales](https://github.com/MousScales)
- **Portfolio:** [mousholdings.com](https://mousholdings.com)
- **Styld:** [styldd.com](https://styldd.com)

---

© 2026 Moustapha Gueye. All rights reserved.
