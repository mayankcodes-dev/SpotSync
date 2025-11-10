FROM node


ENV CLOUDINARY_CLOUD_NAME=dgqgzmzed \
    CLOUDINARY_KEY=963466995631486 \
    CLOUDINARY_SECRET=sb87383P1Kk119m6GkA1RMPPdII \
    CLOUDINARY_URL=cloudinary://963466995631486:sb87383P1Kk119m6GkA1RMPPdII@dgqgzmzed \
    MAPTILER_API_KEY=TgHrvqIkDktv9ln40nhF \
    DB_URL=mongodb+srv://yelpUser:izAzXxyo8LLJMENe@cluster0.ke1aeig.mongodb.net \
    SECRET=a-long-random-secret


RUN mkdir -p yelpcamp

COPY . /yelpcamp
COPY . ./package.json 
COPY . ./package-lock.json 


WORKDIR /yelpcamp


CMD ["node", "/yelpcamp/app.js"]

EXPOSE 3000
