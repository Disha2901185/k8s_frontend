pipeline {
  agent any
  environment {
    AWS_REGION = 'ap-south-1'
    ACCOUNT_ID = '728035102492'
    CLUSTER_NAME = 'erp-cluster'
    ECR_REGISTRY = "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    AWS_ACCESS_KEY_ID = credentials('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = credentials('AWS_SECRET_ACCESS_KEY')
  }
  stages {
    stage('Checkout') { steps { checkout scm } }
    
    stage('Build & Push Frontend') {
      steps {
        sh 'docker build -t frontend:${BUILD_NUMBER} .'
        sh 'aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY'
        sh 'docker tag frontend:${BUILD_NUMBER} $ECR_REGISTRY/frontend:${BUILD_NUMBER}'
        sh 'docker push $ECR_REGISTRY/frontend:${BUILD_NUMBER}'
      }
    }
    
    stage('Deploy Frontend to EKS') {
      steps {
        sh 'aws eks update-kubeconfig --region $AWS_REGION --name $CLUSTER_NAME'
        sh 'kubectl set image deployment/frontend frontend=$ECR_REGISTRY/frontend:${BUILD_NUMBER} -n erp'
        sh 'kubectl rollout status deployment/frontend -n erp'
      }
    }
  }
}
