const responseMessage = (responseBody) => {
  const response = {
    status: responseBody.status,
    data: responseBody.data.message,
  };
  return response;
};

const responseData = (responseBody) => {
  const response = {
    status: responseBody.status,
    data: responseBody.data,
  };

  return response;
};

const responseErrorMessage = (error) => {
  const responseError = {
    status: error.response,
    data: error.response.data,
  };

  return responseError;
};

const responseDto = (responseBody: any) => {
  const response = {
    data: responseBody,
  };

  return response;
};

export { responseMessage, responseData, responseErrorMessage, responseDto };
