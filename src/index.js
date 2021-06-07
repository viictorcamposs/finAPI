const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();

app.use(express.json());

let customers = [];

// Middlewares
const checkIfCustomerExists = (request, response, next) => {
  const { cpf } = request.headers;

  const customer = customers.find(customer => customer.cpf === cpf);

  if (!customer) {
    return response.status(400).json({
      Error: "Not possible to proceed with this request."
    });
  }

  request.customer = customer;

  return next();
};
const getBalance = (statement) => {
  const balance = statement.reduce((acc, operation) => {
    if (operation.type === 'credit') {
      return acc + operation.amount
    } else {
      return acc - operation.amount
    }
  }, 0);

  return balance;
};

app.get('/account/all', (request, response) => {
  return response.status(200).json(customers);
});

app.get('/account', checkIfCustomerExists, (request, response) => {
  const { customer } = request;

  return response.status(200).json(customer);
});

app.get('/statement/date', checkIfCustomerExists, (request, response) => {
  const { customer } = request;
  const { date } = request.query;

  const dateFormat = new Date(date + " 00:00");

  const statement = customer.statement.filter(
    operation =>
      operation.created_at.toDateString() === new Date(dateFormat).toDateString()
  );

  return response.status(200).json(statement);
});

app.get('/account/balance', checkIfCustomerExists, (request, response) => {
  const { customer } = request;

  const balance = getBalance(customer.statement);

  const accountWithBalance = {
    ...customer,
    balance,
  }

  return response.status(200).json(accountWithBalance);
});

app.get('/statement', checkIfCustomerExists, (request, response) => {
  const { customer } = request;

  return response.status(200).json(customer.statement);
});

app.post('/account', (request, response) => {
  const { cpf, name } = request.body;

  const customerAlreadyExists = customers.some(customer => customer.cpf === cpf);

  if (customerAlreadyExists) {
    return response.status(400).json({
      error: "Can't create an account with this CPF."
    });
  }

  if (!cpf || !name) {
    return response.status(400).json({
      error: "All information must be filled."
    });
  }

  customers.push({
    id: uuidv4(),
    cpf,
    name,
    statement: [],
  });

  const customer = customers.find(customer => customer.cpf === cpf);

  return response.status(201).json({
    success: "Account created.",
    customer,
  });
});

app.post('/deposit', checkIfCustomerExists, (request, response) => {
  const { description, amount } = request.body;
  const { customer } = request;

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: 'credit'
  }

  customer.statement.push(statementOperation);

  return response.status(201).json({
    statementOperation,
    success: "Deposit made successfully."
  });
});

app.post('/withdraw', checkIfCustomerExists, (request, response) => {
  const { amount } = request.body;
  const { customer } = request;

  const balance = getBalance(customer.statement);

  if (balance < amount) {
    return response.status(400).json({
      error: "Insufficient funds."
    })
  }

  const statementOperation = {
    amount,
    created_at: new Date(),
    type: 'debit',
  };

  customer.statement.push(statementOperation);

  return response.status(201).json({
    statementOperation,
    success: "Successful withdrawal."
  });
});

app.put('/account', checkIfCustomerExists, (request, response) => {
  const { name } = request.body;
  const { customer } = request;

  customer.name = name;

  return response.status(201).json({
    customer,
    success: "Account's name changed successfully."
  });
});

app.delete('/account', checkIfCustomerExists, (request, response) => {
  const { customer } = request;

  customers = customers.filter(client => client.cpf !== customer.cpf)

  return response.status(200).json({
    customers,
    success: "Account successfully deleted."
  });
});

app.listen(3030, () => console.log("Server's running on port 3030"));
