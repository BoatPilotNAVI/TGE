**Смарт-контракты для проведения TGE**

**Тест контрактов**

Тесты выполнялись с помощью фреймворка Truffle и тестовой ноды TestRPC.

Для теста в TestRPC, необходимо использовать предустановленные аккаунты:

testrpc --account="0x2f9b8503ce21fbe908fc0ec55db3b389337c91d1671b93eb717ea1b935c1f498,100000000000000000000000" --account="0x59fd18910feae5a66c807690883133d46124655cfcf3a73e8ab9394960115542,100000000000000000000000" --account="0xb104e59390779b5654141ba1d7ba96aaf19efd8656cae9a92059d55cd333fde2,100000000000000000000000" --account="0x12ae9d7f4eeeb603515de2d2d85f4e4664014ffc83e4838b0663abd7b79869e3,100000000000000000000000" --account="0xede98b10900a143c659d4bfa0a82f78c7a63ed7bc26b5fccfc41d8bd9e80f3aa,100000000000000000000000" --account="0x433ca4ea4bab9c0d3136e26e8010f5fe19eb5bcc54816616d4d3689ebc34a2d2,100000000000000000000000" --account="0x30e05cf00c12e867012c30026ec90d738fca1bf8e623c4c951c04674aa294c02,100000000000000000000000" --account="0x8dcf931ce42b001ed060b37a0c38294c9ce2ec2423c7c4e0815a44841e12a7e1,100000000000000000000000" --account="0xce968b9c7ed25b4de22d87f56dfdfa01d9a4a1c76a3e4a14b5c93047ff523746,100000000000000000000000" --account="0xe74293bf0db72a9ef442759b19119086bd1bdcb3914ab331397ec8472259ac02,0" -u 0 -u 1 -u 3 -u 3 -u 4 -u 5 -u 6 -u 7 -u 8 -u 9

Далее выполнить: 

truffle migrate --network dev

Поочередно меняя сценарии в тестовом скрипте необходимо прогнать все тесты. 
При этом необходимо каждый раз перезапускать TestRPC.
 
Тесты выполняются с помощью команды:

truffle test --network dev

**Общие схемы**

![Граф состояний](https://raw.githubusercontent.com/BoatPilotNAVI/TGE/master/schemes/stateGraph.png)

![Граф вызова функции покупки](https://raw.githubusercontent.com/BoatPilotNAVI/TGE/master/schemes/buyFunctionGraph.png)

![Граф вызова функций](https://raw.githubusercontent.com/BoatPilotNAVI/TGE/master/schemes/functionCallGraph.png)
