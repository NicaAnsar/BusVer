# Marketing Helper

## Overview

This is a full-stack web application for business data verification and prospecting. The application allows users to upload business data files (CSV/Excel), map columns to standardized fields, and perform automated verification or prospecting operations. It features a modern React frontend with shadcn/ui components and an Express.js backend with PostgreSQL database integration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query for server state management
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite with React plugin

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with JSON responses
- **File Processing**: Support for CSV and Excel file uploads with column mapping
- **Job Processing**: Asynchronous processing system for verification and prospecting tasks
- **Error Handling**: Centralized error handling middleware

### Data Storage
- **Primary Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon serverless PostgreSQL
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Session Storage**: PostgreSQL sessions with connect-pg-simple
- **In-Memory Storage**: Fallback memory storage implementation for development

### Database Schema
- **Users**: User accounts and authentication
- **Business Data**: Uploaded files and processing metadata
- **Processing Jobs**: Background job tracking for verification/prospecting
- **Business Records**: Individual business records with verification status

### Processing Pipeline
- **File Upload**: Multi-format file support (CSV, Excel) with validation
- **Column Mapping**: AI-powered column detection and manual mapping interface
- **Job Queue**: Asynchronous processing with progress tracking
- **Data Verification**: Business information validation and enrichment
- **Prospecting**: New business discovery based on criteria

### Development & Build
- **Development**: Hot reload with Vite dev server
- **Production Build**: Vite for frontend, esbuild for backend bundling
- **Type Checking**: Strict TypeScript configuration
- **Code Quality**: ESLint and Prettier integration via shadcn/ui standards

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: Neon PostgreSQL serverless driver
- **drizzle-orm**: TypeScript ORM with Drizzle Kit for schema management
- **express**: Node.js web framework
- **react**: Frontend framework with React DOM
- **@tanstack/react-query**: Server state management

### UI and Styling
- **@radix-ui/***: Comprehensive set of accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Dynamic class name generation
- **lucide-react**: Icon library

### Data Processing
- **zod**: Schema validation for forms and API requests
- **react-hook-form**: Form state management
- **date-fns**: Date manipulation utilities
- **Papa Parse**: CSV parsing (loaded via CDN)
- **ExcelJS**: Excel file processing (loaded via CDN)

### Development Tools
- **vite**: Frontend build tool and dev server
- **tsx**: TypeScript execution for development
- **wouter**: Lightweight client-side routing
- **@replit/vite-plugin-***: Replit-specific development plugins

### Session and Security
- **connect-pg-simple**: PostgreSQL session store
- **express-session**: Session middleware (implied by pg session store)

The application uses a modern, type-safe stack with serverless database integration and comprehensive UI components for a professional business data management experience.