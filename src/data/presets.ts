import { ScenarioPreset } from '../types';

export const BENCHMARK_PRESETS: ScenarioPreset[] = [
  {
    id: 'fintech-lead',
    title: 'Fintech Backend Lead Migration',
    role: 'Senior Node.js & Microservices Engineer',
    company: 'FinPay Systems',
    description: 'Tests candidate experience against high-scale payment processing requirements and legacy PHP to Node migration.',
    candidate_a: {
      name: 'Alex Rivera',
      raw_resume: `Alex Rivera
Senior Software Engineer | San Francisco, CA

EXPERIENCE
TechCorp — Senior Developer (2021 - Present)
• Led a team of 5 engineers to migrate legacy PHP monolith to Node.js microservices, improving API response latency by 40%.
• Designed and executed PostgreSQL query optimizations, handling over $2M in daily transaction volume with 99.95% uptime.
• Integrated Stripe & Plaid payment gateways with end-to-end encryption, reducing checkout abandonment by 18%.
• Established CI/CD pipelines using GitHub Actions and AWS ECS, cutting deployment times from 45 mins to 8 mins.

DataFlow Inc — Software Engineer (2018 - 2021)
• Built RESTful APIs in Express and TypeScript serving 1.2M monthly active users.
• Architected Redis caching layer that reduced database load by 35% during peak trading hours.
• Mentored 3 junior developers and instituted strict unit testing practices with 85%+ code coverage.

SKILLS & TOOLS
Node.js, Express, TypeScript, PHP, PostgreSQL, Redis, AWS (ECS, S3), Docker, GitHub Actions, Stripe API, Plaid API.

EDUCATION
B.S. in Computer Science, UC Berkeley`
    },
    candidate_b: {
      name: 'Sarah Chen',
      raw_resume: `Sarah Chen
Staff Systems Architect | New York, NY

EXPERIENCE
PayScale Labs — Staff Engineer (2020 - Present)
• Architected high-throughput payment settlement engine in Go and Python processing $10M+ daily.
• Implemented PCI-DSS Level 1 compliance security protocols and tokenization storage.
• Maintained Kubernetes cluster across AWS EKS with multi-region failover achieving 99.999% availability.
• Championed event-driven architecture with Apache Kafka, processing 50,000 events/second.

Apex Financial — Backend Engineer (2017 - 2020)
• Developed risk fraud detection service analyzing real-time transactions with machine learning models.
• Refactored legacy MySQL databases into distributed Cassandra nodes to support 5x scale growth.

SKILLS & TOOLS
Go, Python, Kubernetes, Docker, AWS EKS, Apache Kafka, PostgreSQL, Cassandra, PCI-DSS, gRPC, Terraform.

EDUCATION
M.S. in Software Engineering, Columbia University`
    },
    job_description: `Target Role: Senior Node.js & Microservices Lead
Company: FinPay Systems

About the Role:
We are seeking an experienced Senior Engineering Lead to drive our core payment platform modernization.

Key Responsibilities:
• Lead microservice architecture transitions from monolithic backends into scalable Node.js/TypeScript services.
• Optimize API latency and database performance for multi-million dollar daily transaction processing.
• Implement robust AWS containerized services (ECS/EKS) and CI/CD pipelines.
• Enforce strict security, compliance, and automated testing standard operating procedures.

Must-Haves:
• 5+ years of hands-on experience with Node.js, Express, and TypeScript.
• Proven track record of migrating legacy systems (e.g., PHP or Java) to Node.js microservices.
• Deep expertise in relational databases (PostgreSQL/MySQL) and query latency optimization.
• Direct experience with payment processing, high-volume transactions, and API security.

Nice-to-Haves:
• Hands-on Kubernetes / Terraform experience.
• Familiarity with Redis caching and event-driven architectures.`
  },
  {
    id: 'health-data',
    title: 'Healthcare AI & Data Pipeline Lead',
    role: 'Principal Data Engineer',
    company: 'HealthPulse AI',
    description: 'Evaluates HIPAA compliance, PySpark/Snowflake claims, and flags unverified clinical tools.',
    candidate_a: {
      name: 'Marcus Vance',
      raw_resume: `Marcus Vance
Senior Data Engineer | Boston, MA

EXPERIENCE
BioHealth Tech — Senior Data Engineer (2020 - Present)
• Built Python and PySpark ETL pipelines ingesting 15M+ patient health records daily while adhering strictly to HIPAA and HITECH compliance.
• Optimized Snowflake data warehouse architecture, reducing query execution costs by $45k annually.
• Built automated FHIR API data ingestion bridges connecting EPIC and Cerner EHR platforms.
• Deployed Airflow DAGs for real-time patient risk stratifications.

MedData Solutions — Data Analyst (2017 - 2020)
• Structured SQL data marts for clinical quality reporting across 30 hospital networks.
• Created Tableau executive dashboards tracking ICU bed utilization during peak surge periods.

SKILLS & TOOLS
Python, PySpark, SQL, Snowflake, Apache Airflow, HIPAA, FHIR, AWS S3, Tableau, dbt.

EDUCATION
B.S. in Applied Mathematics, MIT`
    },
    candidate_b: {
      name: 'Elena Rostova',
      raw_resume: `Elena Rostova
Lead Data Architect | Chicago, IL

EXPERIENCE
CareGrid Systems — Lead Data Architect (2019 - Present)
• Directed cloud migration of 50TB clinical data repository to Databricks and AWS S3.
• Implemented end-to-end data governance and row-level security policy for HIPAA compliance.
• Mentored team of 6 data engineers in Python, Delta Lake, and dbt workflows.

SKILLS & TOOLS
Python, Databricks, Spark, SQL, AWS, Delta Lake, dbt, PostgreSQL.

EDUCATION
M.S. in Computer Science, Northwestern University`
    },
    job_description: `Target Role: Principal Data Engineer
Company: HealthPulse AI

Responsibilities:
• Architect scalable clinical data pipelines using Python, PySpark, and Snowflake.
• Guarantee 100% HIPAA compliance and secure FHIR API integration for hospital EHR systems.
• Lower compute latency for predictive AI patient risk models.

Requirements:
• Python, PySpark, Snowflake expertise.
• Verified experience with HIPAA compliance and clinical FHIR standards.
• Proven track record of handling multi-million record patient datasets.`
  }
];
