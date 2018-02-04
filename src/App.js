import React, { Component } from 'react';
import './App.css';
import * as io from "socket.io-client";
import ReactDOM from 'react-dom';
import {Area, AreaChart, ResponsiveContainer} from 'recharts';

const exchange = "Bitfinex";
const watchlist = ['BTC', 'ETH', 'XRP', 'BCH', 'EOS', 'BTG', 'LTC', 'NEO', 'DASH', 'XMR', 'ETC', 'ZEC', 'OMG'];
let socket;



// App
const Watcher = ({price, symbol, change, popupDelay, chartData}) => (
    <a className={`App__dashboard-watcher ${change > 0 ? 'gain':'lost'}`}
       style={{
           animationDelay: popupDelay+'s'
       }}
       target="_blank"
       href={`https://www.cryptocompare.com/coins/${symbol.toLowerCase()}/overview/${symbol}`}
    >
        <div className="chart" >
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={chartData}
                >
                    <Area
                        type='monotone'
                        dataKey='close'
                        stroke={change > 0 ? '#63b556' : '#ff6939'}
                        fill={change > 0 ? '#63b556' : '#ff6939'} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
        <h2>{symbol}</h2>
        <h1>${price}</h1>
        <span className="indicator" />
        <span className="change">{change}%</span>
    </a>
);

class App extends React.Component {
    state = {
        watcher: watchlist,
        data: {},
        chartData: {},
        socket: 'Off',
    };

    componentDidMount(){
        socket = io.connect('https://streamer.cryptocompare.com/');
        const subs = this.state.watcher.map(symbol => `2~${exchange}~${symbol}~USD`);
        socket.emit('SubAdd', { subs });
        socket.on("m", this.newChange.bind(this));
        socket.on('connect', ()=>this.setState({ socket: 'On'}));
        socket.on('disconnect', ()=>this.setState({ socket: 'Off'}));

        this.state.watcher.forEach(symbol=>this.loadChart(symbol));
        setInterval(()=>this.state.watcher.forEach(symbol=>this.loadChart(symbol)), 30000)
    }

    loadChart(symbol){
        fetch(`https://min-api.cryptocompare.com/data/histoday?fsym=${symbol}&tsym=USD&limit=60&aggregate=3&e=CCCAGG`)
            .then(res=>res.json())
            .then(data=>{
                this.setState({
                    chartData: Object.assign({}, this.state.chartData, {
                        [symbol]: data.Data
                    })
                })
            })
    }

    newChange(message){
        const data = message.split("~");

        if(data[4] === "1" || data[4] === "2" || data[4] === "4"){
            var fsym = data[2];
            var detail;
            if(typeof this.state.data[fsym] === 'undefined'){
                detail = {
                    price: data[5],
                    volume24: data[10],
                    open24:data[12]
                };

                detail.pctChange = ( (detail.price - detail.open24) / detail.open24 * 100).toFixed(2)
            }else if(data[4] === "1" || data[4] === "2"){
                detail = Object.assign({}, this.state.data[fsym], {
                    price: data[5],
                    volume24: data[10]
                });
                detail.pctChange = ( (detail.price - detail.open24) / detail.open24 * 100).toFixed(2)
            }

            this.setState({
                data: Object.assign({}, this.state.data, {
                    [fsym]: Object.assign({}, this.state.data[fsym], detail),
                })
            })
        }

    }

    render(){
        return (
            <div className="App">
                <div className="App__dashboard">
                    {
                        this.state.watcher.map( (symbol, i) =>
                            <Watcher
                                key={symbol}
                                symbol={symbol}
                                price={this.state.data[symbol] ? this.state.data[symbol].price : '...'}
                                change={this.state.data[symbol] ? this.state.data[symbol].pctChange : '..'}
                                popupDelay={.55+ i*.2}
                                chartData={this.state.chartData[symbol]}
                            />)
                    }
                </div>
                <span>Current Exchange: {exchange}</span>
                <span>
          Data stream:
          <span
              style={{color: this.state.socket === 'On' > 0 ? '#ff6939' : '#63b556'}}>
            {this.state.socket}
          </span>
        </span>
                <span>Data source: <a href="https://www.cryptocompare.com" target="_blank">CryptoCompare</a></span>
            </div>
        )
    }
}


ReactDOM.render(<App />, document.getElementById('root'));
export default App;
