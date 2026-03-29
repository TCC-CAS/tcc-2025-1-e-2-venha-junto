import socket
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
result = sock.connect_ex(('127.0.0.1', 8000))
if result == 0:
   print("Porta 8000 está aberta!")
else:
   print("Porta 8000 está fechada.")
sock.close()
