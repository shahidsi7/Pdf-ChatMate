# Pdf-ChatMate :

1. Creating Python environment : python -m venv .venv

2. Activating the python environment : .venv/Scripts/activate

3. Installing all the python libraries :
  a. pip install flask
  b. pip install flask_cors
  c. pip install fitz
  d. pip install PyMuPDF
  e. pip install google-generativeai
  f. pip install frontend
  g. pip install tools
  h. pip install waitress

5. Creating requirements.txt : pip freeze > requirements.txt

6. Setting all the files in this structure :

  PDF-ChatMate/
│
├── app.py
├── Dockerfile
├── .dockerignore
├── requirements.txt
│
├── Pdf_extracter.py
├── Image_extracter.py
│
├── uploads/                # Temporary PDF storage (runtime)
│
├── templates/
│   └── index.html
│

6. Checking if project running locally or not : waitress-serve --host 127.0.0.1 app:app

7. Creating docker image and pushing into docker hub (In same terminal of VSCode) :
   a. docker login (Login to docker hub)
   b. docker build -t image_name . (Creating the docker image)
   c. docker tag image_name:latest username_docker_hub/image_name:tag_version (Giving tag version to the image)
   d. docker push username_docker_hub/image_name:tag_version (Pushing it to docker hub repository)

8. Login to openshift using API token in CLI :
   
   Step 1 : Create an YAML file having deployment, svc, and route service using this code (notepad file_name.yaml) :

    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: pdfchatmate
      labels:
        app: pdfchatmate
    spec:
      replicas: 1
      selector:
        matchLabels:
          app: pdfchatmate
      template:
        metadata:
          labels:
            app: pdfchatmate
        spec:
          containers:
            - name: pdfchatmate
              image: username_docker_hub/image_name:version_tag        # change your docker image name here
              imagePullPolicy: Always
              ports:
                - containerPort: 8080
              env:
                - name: UPLOAD_FOLDER
                  value: /tmp/uploads
    ---
    apiVersion: v1
    kind: Service
    metadata:
      name: pdfchatmate
    spec:
      selector:
        app: pdfchatmate
      ports:
        - protocol: TCP
          port: 8080
          targetPort: 8080
      type: ClusterIP
    ---
    apiVersion: route.openshift.io/v1
    kind: Route
    metadata:
      name: pdfchatmate
    spec:
      to:
        kind: Service
        name: pdfchatmate
      port:
        targetPort: 8080
      tls:
        termination: edge


  Step 2 : Apply the file using - 
    oc apply -f file_name.yaml

  Step 3 : oc get routes (To get openshift url for accessing web app)
