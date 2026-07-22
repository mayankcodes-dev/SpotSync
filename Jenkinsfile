pipeline {
    agent any

    environment {
        NODE_VERSION = '18'
        APP_NAME     = 'spotsync'
        DIST_DIR     = 'dist'
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {

        // ── 1. Checkout ────────────────────────────────────────────────────
        stage('Checkout') {
            steps {
                checkout scm
                echo "✅ Checked out branch: ${env.BRANCH_NAME}"
            }
        }

        // ── 2. Setup Node.js ───────────────────────────────────────────────
        stage('Setup Node') {
            steps {
                sh 'node --version'
                sh 'npm --version'
            }
        }

        // ── 3. Install Dependencies ────────────────────────────────────────
        stage('Install') {
            steps {
                echo '📦 Installing dependencies...'
                sh 'npm ci --prefer-offline'
            }
        }

        // ── 4. Lint / Type-Check ───────────────────────────────────────────
        stage('Type Check') {
            steps {
                echo '🔍 Running TypeScript type check...'
                sh 'npm run lint'
            }
        }

        // ── 5. Run Tests ───────────────────────────────────────────────────
        stage('Test') {
            environment {
                NODE_ENV = 'test'
                // Provide dummy env vars so imports don't crash
                GROQ_API_KEY             = 'test-key'
                UPSTASH_REDIS_REST_URL   = 'https://fake.upstash.io'
                UPSTASH_REDIS_REST_TOKEN = 'fake-token'
                MAPTILER_API_KEY         = 'test-maptiler-key'
                CLOUDINARY_CLOUD_NAME    = 'test-cloud'
                CLOUDINARY_KEY           = '123456'
                CLOUDINARY_SECRET        = 'test-secret'
                DB_URL                   = 'mongodb://localhost:27017/spotsync-test'
                SECRET                   = 'test-secret'
            }
            steps {
                echo '🧪 Running Jest tests...'
                sh 'npm test -- --forceExit --passWithNoTests'
            }
            post {
                always {
                    // Archive test results if using jest-junit reporter
                    // junit 'coverage/junit.xml'
                    echo '📊 Tests complete'
                }
            }
        }

        // ── 6. Build TypeScript ────────────────────────────────────────────
        stage('Build') {
            steps {
                echo '🔨 Compiling TypeScript...'
                sh 'npm run build'
                echo "✅ TypeScript compiled to /${DIST_DIR}"
            }
        }

        // ── 7. Copy Static Assets ──────────────────────────────────────────
        stage('Copy Assets') {
            steps {
                echo '📁 Copying views and public assets...'
                // Views (EJS templates) stay at project root — app.ts resolves them from ../views
                // Public static files also stay at root — no copy needed for dev
                // For containerized / traditional deployment, copy them next to dist:
                sh '''
                    cp -r views  ${DIST_DIR}/views  2>/dev/null || true
                    cp -r public ${DIST_DIR}/public 2>/dev/null || true
                    echo "Static assets copied to dist/"
                '''
            }
        }

        // ── 8. Archive Artifact ────────────────────────────────────────────
        stage('Archive') {
            steps {
                echo '📦 Archiving build artifact...'
                sh '''
                    tar -czf spotsync-build-${BUILD_NUMBER}.tar.gz \
                        dist/ \
                        package.json \
                        package-lock.json \
                        .env.example 2>/dev/null || true
                '''
                archiveArtifacts artifacts: 'spotsync-build-*.tar.gz', fingerprint: true
            }
        }

        // ── 9. Deploy (placeholder) ────────────────────────────────────────
        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                echo '🚀 Deploying SpotSync...'
                // Option A: PM2 restart on remote server
                // sh 'ssh deploy@your-server "cd /var/www/spotsync && git pull && npm ci && npm run build && pm2 restart spotsync"'

                // Option B: Docker build & push
                // sh 'docker build -t spotsync:${BUILD_NUMBER} .'
                // sh 'docker tag spotsync:${BUILD_NUMBER} your-registry/spotsync:latest'
                // sh 'docker push your-registry/spotsync:latest'

                echo '✅ Deployment step configured — uncomment your preferred deploy method above.'
            }
        }
    }

    post {
        success {
            echo """
            ╔══════════════════════════════════════╗
            ║  ✅ SpotSync Build #${BUILD_NUMBER} PASSED  ║
            ╚══════════════════════════════════════╝
            """
        }
        failure {
            echo """
            ╔══════════════════════════════════════╗
            ║  ❌ SpotSync Build #${BUILD_NUMBER} FAILED  ║
            ╚══════════════════════════════════════╝
            """
        }
        always {
            cleanWs()
        }
    }
}
